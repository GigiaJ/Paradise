(ns room.room-list
  (:require
   [clojure.string :as str]
   [promesa.core :as p]
            [re-frame.core :as re-frame]
            [taoensso.timbre :as log]
            [re-frame.db :as db]
            ["react-virtuoso" :refer [Virtuoso]]
            [promesa.core :as p]
            [reagent.core :as r]
            [reagent.dom.client :as rdom]
            [room.room-summary :refer [build-room-summary]]
            [room.entry :refer [build-room-actions]]

            [client.diff-handler :refer [apply-matrix-diffs]]
            [utils.global-ui :refer [avatar long-press-props]]
            ["generated-compat" :as sdk :refer [RoomListEntriesDynamicFilterKind RoomListFilterCategory RoomListLoadingState]])
  (:require-macros [utils.macros :refer [ocall oget]]))


(re-frame/reg-event-db
 :rooms/parent-resolved
 (fn [db _]
   (update-in db [:ui :parent-refresh-counter] (fnil inc 0))))

(defonce !parent-queue (atom {}))

(defn enqueue-parent-check! [room-id]
  (swap! !parent-queue update room-id #(if % % 0)))

(defn process-parent-queue! []
  (let [queue         @!parent-queue
        db            @re-frame.db/app-db
        space-service (:space-service db)
        cache         (get db :rooms-unfiltered-cache {})]
    (when (and space-service (seq queue))
      (-> (p/all
           (map (fn [[id attempts]]
                  (if-let [room (get cache id)]
                    (-> (.joinedParentsOfChild space-service id)
                        (p/then (fn [parents]
                                  (if (pos? (alength parents))
                                    {:id id :status :success :parents parents :room room}
                                    {:id id :status :retry :attempts (inc attempts)})))
                        (p/catch (fn [e]
                                   (js/console.error "Queue FFI fail for" id e)
                                   {:id id :status :retry :attempts (inc attempts)})))
                    (p/resolved {:id id :status :drop})))
                queue))

          (p/then (fn [results]
                    (doseq [res results]
                      (when (= (:status res) :success)
                        (let [room (:room res)
                              parents (:parents res)]
                          (aset room "parents" parents)
                          (aset room "first-parent-id" (.-roomId (aget parents 0))))))

                    (let [to-keep (reduce (fn [acc res]
                                            (if (and (= (:status res) :retry)
                                                     (< (:attempts res) 3))
                                              (assoc acc (:id res) (:attempts res))
                                              acc))
                                          {}
                                          results)]
                      (reset! !parent-queue to-keep)

                      (when (some #(= (:status %) :success) results)
                        (re-frame/dispatch [:rooms/parent-resolved]))

                      (when (seq to-keep)
                        (js/setTimeout process-parent-queue! 2000)))))))))


(defn parse-room [client space-service room-interface]
  (p/let [room-info     (if (fn? (.-roomInfo room-interface)) (.roomInfo room-interface) nil)
          latest-event  (.latestEvent room-interface)
          room-id       (.-id room-info)

          ]

    (let [summary (build-room-summary room-interface room-info latest-event)
          room-preview  (when (and client (exists? (.-getRoomPreviewFromRoomId client)))
                          (try
                            (p/promise (.getRoomPreviewFromRoomId client room-id #js []))
                          (catch :default e
                            (js/console.error "FFI Call Failed for:" room-id e))))]
      (aset summary "raw-room" room-interface)
      (aset summary "room-preview" room-preview)
      summary)))

(defn fetch-space-hierarchy [space-id]
  (let [client @(re-frame/subscribe [:sdk/client])
        base-url (.homeserver client)
        token (.. client -session -accessToken)
        ;;_ (js/console.log base-url)
        url (str base-url "/_matrix/client/v3/rooms/" space-id "/hierarchy")]
    (-> (js/fetch url #js {:headers #js {:Authorization (str "Bearer " token)}})
        (p/then #(.json %))
        (p/then (fn [json]
                  (let [resp (js->clj json :keywordize-keys true)]
                    (re-frame/dispatch [:rooms/process-hierarchy space-id (:rooms resp)])))))))

(re-frame/reg-event-db
 :rooms/process-hierarchy
 (fn [db [_ root-space-id rooms]]
   (let [hierarchy-orders
         (reduce
          (fn [acc room]
            (let [parent-id       (:room_id room)
                  children-events (:children_state room)]
              (if (seq children-events)
                (let [child-map (reduce
                                 (fn [cmap event]
                                   (if (= (:type event) "m.space.child")
                                     (let [child-id (:state_key event)
                                           order    (get-in event [:content :order] "zzzz")]
                                       (assoc cmap child-id order))
                                     cmap))
                                 {}
                                 children-events)]
                  (assoc acc parent-id child-map))
                acc)))
          {}
          rooms)]
     (log/debug "Corrected Space Orders:" hierarchy-orders)
     (update db :space-orders merge hierarchy-orders))))

(re-frame/reg-sub
 :rooms/space-orders
 (fn [db _]
   (get db :space-orders {})))


(defn get-rust-filter [filter-id]
  (case filter-id
    "unread"
    (RoomListEntriesDynamicFilterKind.All.
      #js {:filters #js [(RoomListEntriesDynamicFilterKind.Unread.)
                         (RoomListEntriesDynamicFilterKind.DeduplicateVersions.)]})
    "people"
    (RoomListEntriesDynamicFilterKind.All.
      #js {:filters #js [(RoomListEntriesDynamicFilterKind.Category. #js {:expect RoomListFilterCategory.People})
                         (RoomListEntriesDynamicFilterKind.Joined.)
                         (RoomListEntriesDynamicFilterKind.DeduplicateVersions.)]})
    "favourite"
    (RoomListEntriesDynamicFilterKind.All.
      #js {:filters #js [(RoomListEntriesDynamicFilterKind.Favourite.)
                         (RoomListEntriesDynamicFilterKind.DeduplicateVersions.)]})

    (RoomListEntriesDynamicFilterKind.All.
      #js {:filters #js [(RoomListEntriesDynamicFilterKind.NonLeft.)
                         (RoomListEntriesDynamicFilterKind.DeduplicateVersions.)]})))

(defonce !room-mutex (atom (p/resolved nil)))
(defn apply-home-diffs-async! [updates]
  (swap! !room-mutex
         (fn [prev-promise]
           (p/then prev-promise
                   (fn []
                     (let [db @re-frame.db/app-db
                           current-rooms (get db :rooms [])
                           space-service (:space-service db)
                           client (:client db)]
                       (-> (apply-matrix-diffs current-rooms updates #(parse-room client space-service %))
                           (p/then (fn [next-rooms]
                                     (re-frame/dispatch-sync [:room-list/set-home-rooms-sync next-rooms])
                                     (re-frame/dispatch [:room-list/set-home-rooms next-rooms])))
                           (p/catch (fn [err]
                                      (log/error "Global Diff Panic:" err)
                                      nil)))))))))


(re-frame/reg-event-fx
 :room-list/home-rooms-diff
 (fn [_ [_ updates]]
   (apply-home-diffs-async! updates)
   {}))

(re-frame/reg-event-db
 :room-list/set-home-rooms-sync
 (fn [db [_ rooms]]
   (assoc db :rooms rooms)))

(re-frame/reg-event-fx
 :room-list/set-home-rooms
 (fn [_ [_ rooms]]
   (let [top-room-ids (take 5 (map #(.-id %) rooms))]
     {:dispatch [:sdk/preload-timelines top-room-ids]})))

(re-frame/reg-event-db
 :room-list/save-home-list-handle
 (fn [db [_ result]]
   (assoc db
          :home-list-result result
          :home-list-controller (.controller result))))


(defonce !bg-room-mutex (atom (p/resolved nil)))

(defn apply-bg-rooms-diffs! [updates]
  (swap! !bg-room-mutex
         (fn [prev-promise]
           (p/then prev-promise
                   (fn []
                     (let [db @re-frame.db/app-db
                           current-rooms (get db :bg-rooms-array #js [])
                           old-cache (get db :rooms-unfiltered-cache {})
                           space-service (:space-service db)
                           client (:client db)]
                       (-> (apply-matrix-diffs current-rooms updates #(parse-room client space-service %))
                           (p/then (fn [next-rooms]
                                     (doseq [r next-rooms]
                                       (let [id (or (.-id r) (.-roomId r) (aget r "roomId"))]
                                         (when-let [old-room (get old-cache id)]
                                           (when-let [pid (aget old-room "first-parent-id")]
                                             (aset r "parents" (aget old-room "parents"))
                                             (aset r "first-parent-id" pid)))))
                                     (re-frame/dispatch-sync [:room-list/set-bg-rooms-sync next-rooms])
                                     (doseq [r next-rooms]
                                       (when-not (aget r "first-parent-id")
                                         (let [id (or (.-id r) (.-roomId r) (aget r "roomId"))]
                                           (enqueue-parent-check! id))))
                                     (process-parent-queue!)))
                           (p/catch (fn [err]
                                      (log/error "Global Diff Panic:" err)
                                      nil)))))))))



(re-frame/reg-event-db
 :room-list/set-bg-rooms-sync
 (fn [db [_ rooms-list]]
   (let [rooms-map (reduce (fn [acc r]
                             (let [id (or (.-id r) (.-roomId r) (aget r "roomId"))]
                               (assoc acc id r)))
                           {}
                           rooms-list)]
     (assoc db
            :bg-rooms-array rooms-list
            :rooms-unfiltered-cache rooms-map))))

(re-frame/reg-event-db
 :room-list/save-bg-list-handle
 (fn [db [_ result]]
   (assoc db
     :bg-room-list-result result
     :bg-room-list-controller (.controller result))))

(re-frame/reg-event-fx
 :room-list/bg-rooms-diff
 (fn [_ [_ updates]]
   (apply-bg-rooms-diffs! updates)
   {}))



(defonce !bg-room-mutex (atom (p/resolved nil)))

(defn apply-bg-rooms-diffs! [updates]
  (swap! !bg-room-mutex
         (fn [prev-promise]
           (p/then prev-promise
                   (fn []
                     (let [db @re-frame.db/app-db
                           current-rooms (get db :bg-rooms-array #js [])
                           old-cache (get db :rooms-unfiltered-cache {})
                           space-service (:space-service db)
                           client (:client db)]
                       (-> (apply-matrix-diffs current-rooms updates #(parse-room client space-service %))
                           (p/then (fn [next-rooms]
                                     (doseq [r next-rooms]
                                       (let [id (or (.-id r) (.-roomId r) (aget r "roomId"))]
                                         (when-let [old-room (get old-cache id)]
                                           (when-let [pid (aget old-room "first-parent-id")]
                                             (aset r "parents" (aget old-room "parents"))
                                             (aset r "first-parent-id" pid)))))
                                     (re-frame/dispatch-sync [:room-list/set-bg-rooms-sync next-rooms])
                                     (doseq [r next-rooms]
                                       (when-not (aget r "first-parent-id")
                                         (let [id (or (.-id r) (.-roomId r) (aget r "roomId"))]
                                           (enqueue-parent-check! id))))
                                     (process-parent-queue!)))
                           (p/catch (fn [err]
                                      (log/error "Global Diff Panic:" err)
                                      nil)))))))))



(re-frame/reg-event-db
 :room-list/set-bg-rooms-sync
 (fn [db [_ rooms-list]]
   (let [rooms-map (reduce (fn [acc r]
                             (let [id (or (.-id r) (.-roomId r) (aget r "roomId"))]
                               (assoc acc id r)))
                           {}
                           rooms-list)]
     (assoc db
            :bg-rooms-array rooms-list
            :rooms-unfiltered-cache rooms-map))))

(re-frame/reg-event-db
 :room-list/save-bg-list-handle
 (fn [db [_ result]]
   (assoc db
     :bg-room-list-result result
     :bg-room-list-controller (.controller result))))

(re-frame/reg-event-fx
 :room-list/bg-rooms-diff
 (fn [_ [_ updates]]
   (apply-bg-rooms-diffs! updates)
   {}))





(defn start-room-list-sync! [room-list]
  (log/debug "Starting Dual Room List Sync (UI + Background)")
  (p/let [ui-result (.entriesWithDynamicAdapters room-list 200
                                               #js {:onUpdate #(re-frame/dispatch [:room-list/home-rooms-diff %])})
        ui-controller (.controller ui-result)
        bg-result (.entriesWithDynamicAdapters room-list 200
                                               #js {:onUpdate #(re-frame/dispatch [:room-list/bg-rooms-diff %])})
        bg-controller (.controller bg-result)]

    (re-frame/dispatch [:room-list/set-filter "people"])
    (.setFilter ui-controller (get-rust-filter "people"))
    (.addOnePage ui-controller)
    (re-frame/dispatch [:room-list/save-home-list-handle ui-result])
    (.setFilter bg-controller (get-rust-filter "all"))
    (.addOnePage bg-controller)
    (re-frame/dispatch [:room-list/save-bg-list-handle bg-result])))

(defn distinct-by [f coll]
  (let [!seen (atom #{})]
    (filterv (fn [x]
               (let [k (f x)]
                 (if (contains? @!seen k)
                   false
                   (do (swap! !seen conj k)
                       true))))
             coll)))


(defn safe-get [obj k-str k-kw]
  (if (map? obj)
    (get obj k-kw)
    (let [v (aget obj k-str)]
      (if (undefined? v)
        (aget obj (name k-kw))
        v))))


(defn flatten-tree [rooms-map children-map space-orders closed-drawers parent-id depth]
  (let [sdk-children    (get children-map parent-id [])
        manual-children (->> (vals rooms-map)
                             (filter #(= (safe-get % "first-parent-id" :first-parent-id) parent-id))
                             (map (fn [r] {:id        (or (safe-get r "id" :id) (safe-get r "roomId" :roomId))
                                           :is-space? (safe-get r "isSpace" :isSpace)})))

        orders-for-parent (get space-orders parent-id {})

        child-refs      (->> (concat sdk-children manual-children)
                             (distinct-by :id)
                             (sort-by #(get orders-for-parent (:id %) "zzzz"))
                             (vec))]
    (reduce
     (fn [acc {:keys [id is-space?]}]
       (let [summary       (get rooms-map id)
             item          {:id                 id
                            :is-space?          is-space?
                            :depth              depth
                            :activeRoomCallParticipants (when summary (safe-get summary "activeRoomCallParticipants" :activeRoomCallParticipants))

                            :name               (if summary (or (safe-get summary "name" :name) "Loading...") "Loading...")
                            :avatar             (when summary (safe-get summary "avatar" :avatar))
                            :unreadNotificationsCount (if summary (or (safe-get summary "unreadNotificationsCount" :unreadNotificationsCount) 0) 0)
                            :unreadMentionsCount    (if summary (or (safe-get summary "unreadMentionsCount" :unreadMentionsCount) 0) 0)}
             acc-with-item (conj acc item)]

         (if (and is-space? (not (contains? closed-drawers id)))
           (into acc-with-item (flatten-tree rooms-map children-map space-orders closed-drawers id (inc depth)))
           acc-with-item)))
     []
     child-refs)))



(re-frame/reg-sub
 :rooms/active-id
 (fn [db _]
   (:active-room-id db)))

(re-frame/reg-sub
 :space-rooms
 (fn [db _]
   (vec (or (:space-rooms db) []))))

(re-frame/reg-sub
 :rooms/active-metadata
 :<- [:rooms/active-id]
 :<- [:rooms/unfiltered-indexed-map]
 (fn [[active-id rooms-map] _]
   (when active-id
     (get rooms-map active-id))))

(re-frame/reg-sub
 :rooms/all
 (fn [db _]
   (let [rooms (:rooms db)]
     (if (map? rooms) (vec (vals rooms)) (vec (or rooms []))))))





(re-frame/reg-sub
 :rooms/indexed-map
 :<- [:rooms/all]
 (fn [rooms-list _]
   (reduce (fn [acc room]
             (let [id (or (aget room "id") (aget room "roomId"))]
               (assoc acc id room)))
           {}
           rooms-list)))


(re-frame/reg-sub
 :rooms/ordered-list
 (fn [db _]
   (get db :rooms [])))

(re-frame/reg-sub
 :rooms/current-view
 :<- [:spaces/active-id]
 :<- [:rooms/ordered-list]
 :<- [:rooms/unfiltered-indexed-map]
 :<- [:space-children/map]
 :<- [:rooms/space-orders]
 :<- [:rooms/closed-drawers]
 (fn [[active-id ordered-list indexed-map children-map space-orders closed-drawers] _]
   (if-not active-id
     ordered-list
     (flatten-tree indexed-map children-map space-orders closed-drawers active-id 0))))




(re-frame/reg-event-db
 :rooms/toggle-drawer
 (fn [db [_ drawer-id]]
   (update-in db [:ui :closed-drawers]
              (fn [closed]
                (if (contains? closed drawer-id)
                  (disj closed drawer-id)
                  (conj (or closed #{}) drawer-id))))))

(re-frame/reg-sub
 :rooms/closed-drawers
 (fn [db _]
   (get-in db [:ui :closed-drawers] #{})))



(re-frame/reg-sub
 :rooms/unfiltered-indexed-map
 (fn [db _]
   (get db :rooms-unfiltered-cache {})))



(re-frame/reg-sub
 :rooms/active-room-members
 :<- [:rooms/active-id]
 (fn [active-id db]
   (get-in db [:rooms/members active-id] [])))

(re-frame/reg-event-fx
 :rooms/fetch-members
 (fn [{:keys [db]} [_ room-id]]
   (let [client (:client db)]
     (when (and client room-id)
       (if-let [room (.getRoom client room-id)]
         (p/let [members (.membersNoSync room)
                 parsed  (map (fn [m]
                                {:user-id      (.userId m)
                                 :display-name (or (.displayName m) (.userId m))
                                 :avatar-url   (.avatarUrl m)})
                              members)]
           (re-frame/dispatch [:rooms/save-members room-id parsed]))
         (log/warn "Could not find room in client for members fetch:" room-id))))
   {}))

(re-frame/reg-event-db
 :rooms/save-members
 (fn [db [_ room-id members]]
   (assoc-in db [:rooms/members room-id] members)))


(re-frame/reg-sub
 :space/unread-stats
 :<- [:rooms/unfiltered-indexed-map]
 :<- [:space-children/map]
 :<- [:rooms/space-orders]
 (fn [[rooms-map children-map space-orders] [_ space-id]]
   (log/error space-id)
   (let [rooms-in-space (flatten-tree rooms-map children-map space-orders #{} space-id 0)
         _ (log/error rooms-in-space)
         stats (reduce (fn [acc room]
                         (let [notifs (get room :unreadNotificationsCount 0)
                               mentions (get room :unreadMentionsCount 0)]
                           (-> acc
                               (update :notifs + notifs)
                               (update :mentions + mentions))))
                       {:notifs 0 :mentions 0}
                       rooms-in-space)
         _ (log/error stats)
         ]
     {:unread? (pos? (:notifs stats))
      :notif-count (:notifs stats)
      :mentions (:mentions stats)
      :highlight? (pos? (:mentions stats))})))

(re-frame/reg-sub
 :rooms/active-dm-pops
 :<- [:rooms/unfiltered-indexed-map]
 (fn [rooms-map _]
   (->> (vals rooms-map)
        (filter #(aget % "isDirect"))
        (filter #(pos? (or (aget % "unreadMessagesCount") 0)))
        (sort-by #(or (aget % "last_message_ts") 0) >)
        (map (fn [r]
               (let [msg-count (or (aget r "unreadMessagesCount") 0)
                     mentions  (or (aget r "unreadMentionsCount") 0)]
                 {:id         (aget r "id")
                  :name       (aget r "name")
                  :avatar-url (aget r "avatar")
                  :is-dm?     true
                  :unread?    (pos? msg-count)
                  :highlight? (pos? mentions)
                  :mentions   msg-count}))))))


(defn room-type-call? [db room-id]
  (let [summary (get-in db [:rooms-unfiltered-cache room-id])
        preview (when summary (aget summary "room-preview"))
        info    (when preview (.info @preview))
        type    (when info (.-roomType info))
        tag     (when type (.-tag type))]
    (when tag (and (= "Custom" tag)
                   (= "org.matrix.msc3417.call" (.-value (.-inner type)))))))

(re-frame/reg-sub
 :room/is-call?
 (fn [db [_ room-id]]
   (room-type-call? db room-id)))

(re-frame/reg-event-fx
 :rooms/select
 (fn [{:keys [db]} [_ room-id]]
   (let [current-room-id (:active-room-id db)
         is-call-room?   (room-type-call? db room-id)]
     (if (= current-room-id room-id)
       {:db (assoc-in db [:ui :sidebar-open?] false)}

       (let [new-focus  (if is-call-room? :call :timeline)
             base-db    (-> db
                            (assoc :active-room-id room-id)
                            (assoc-in [:ui :sidebar-open?] false)
                            (assoc-in [:ui :main-focus] new-focus))

             dispatches (remove nil?
                                [(when current-room-id [:sdk/cleanup-timeline current-room-id])
                                 [:sdk/boot-timeline room-id]
                                 [:composer/load-draft room-id]
                                 [:ui/set-main-focus new-focus]
                                 (when is-call-room? [:call/init-widget room-id])])]

         {:db base-db
          :dispatch-n dispatches})))))

(re-frame/reg-event-db
 :room-list/set-filter
 (fn [db [_ filter-id]]
   (assoc db :active-filter-id filter-id)))

(re-frame/reg-sub
 :room-list/active-filter
 (fn [db _]
   (get db :active-filter-id "people")))

(re-frame/reg-event-fx
 :room-list/apply-filter
 (fn [{:keys [db]} [_ filter-id]]
   (let [current-filter (:active-filter-id db)
         controller     (:home-list-controller db)]
     (cond
       (= current-filter filter-id)
       (do (log/debug "Filter already set to:" filter-id)
           {})

       (not controller)
       (do (log/warn "Filter swap failed: No room-list-controller found.")
           {})

       :else
       (do
         (log/debug "Swapping filter from" current-filter "to" filter-id)
         (.setFilter controller (get-rust-filter filter-id))
         (.addOnePage controller)
         {:db (assoc db :active-filter-id filter-id)})))))

(defn filter-toggle-bar []
  (let [active-filter @(re-frame/subscribe [:room-list/active-filter])]
    [:div.filter-bar
     (for [[id label] [["all" "All"] ["unread" "Unread"] ["people" "People"]]]
       ^{:key id}
       [:button.filter-btn
        {:class    (when (= active-filter id) "active")
         :on-click #(re-frame/dispatch [:room-list/apply-filter id])}
        label])]))


(defn virtualized-room-list [client room-array space-id active-room closed-drawers]
  (let [active-filter @(re-frame/subscribe [:room-list/active-filter])]
    [:> Virtuoso
     {:style {:height "100%" :width "100%"}
      :data room-array
      :endReached #(re-frame/dispatch [:room-list/paginate-global])
      :itemContent
      (fn [index raw-room]
        (r/as-element
         (let [room              (if (map? raw-room) raw-room (js->clj raw-room :keywordize-keys true))
               id                (or (:id room) (:roomId room))
               name              (or (:name room) "Loading...")
               is-space?         (or (:is-space? room) (:isSpace room))
               depth             (or (:depth room) 0)
               indent            (* depth 12)
               is-closed?        (contains? closed-drawers id)
               is-call?          (room-type-call? @re-frame.db/app-db id)
               notif-count       (or (:notification-count room) (:unreadNotificationsCount room) 0)
               unread?           (pos? notif-count)
               highlight-count   (or (:highlight-count room) (:unreadMentionsCount room) 0)
               highlight?        (pos? highlight-count)
               avatar-url        (or (:avatar room) (:avatarUrl room))

               call-participants (or (:activeRoomCallParticipants room) [])
              _ (log/error call-participants)

               has-call?         (seq call-participants)
               open-menu-fn      (fn [e mx my]
                                   (when e
                                     (.preventDefault e)
                                     (.stopPropagation e))
                                   (re-frame/dispatch
                                    [:context-menu/open
                                     {:x mx :y my
                                      :items (build-room-actions id name is-space?)}]))]
           (if is-space?
             [:div.room-drawer-header
              (merge {:style {:padding-left (str indent "px")}
                      :class (when is-closed? "collapsed")
                      :on-click #(re-frame/dispatch [:rooms/toggle-drawer id])
                      :on-context-menu #(open-menu-fn % (.-clientX %) (.-clientY %))}
                     (long-press-props #(open-menu-fn nil %1 %2)))
              [:span.drawer-arrow "▼"]
              [:span.drawer-name (str/upper-case name)]]
             [:div.room-container
              [:div.room-item
               (merge {:style {:padding-left (str indent "px")}
                       :class [(when (= id active-room) "active")
                               (when unread? "has-unread")
                               (when highlight? "has-highlight")]
                       :on-click #(re-frame/dispatch [:rooms/select id])
                       :on-context-menu #(open-menu-fn % (.-clientX %) (.-clientY %))}
                      (long-press-props #(open-menu-fn nil %1 %2)))
               (cond
                 is-call?
                 [:svg {:viewBox "0 0 24 24"
                        :width "16px"
                        :height "16px"
                        :style {:margin-right "8px"
                                :fill "none"
                                :stroke "currentColor"
                                :stroke-width "2.5"
                                :stroke-linecap "round"
                                :stroke-linejoin "round"}}
                  [:path {:d "M11 5L6 9H2v6h4l5 4V5z"}]
                  (when has-call?
                    [:path {:d "M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"}])]
                 (and (= active-filter "people") (not space-id))

                 [avatar {:id id :name name :url avatar-url :size 24 :status :online}]

                 :else
                 [:span.room-hash "# "])
               [:span.room-name name]
               (when has-call?
                 [:div.call-participants.hide-on-desktop
                  {:style {:display "flex"
                           :margin-left "auto"
                           :margin-right "8px"}}
                  (for [participant call-participants]
                    ^{:key (str "mobile-call-" (or (:userId participant) participant))}
                    [:div {:style {:margin-left "-8px"
                                   :border "2px solid var(--bg-color)"
                                   :border-radius "50%"}}
                     [avatar {:id (or (:userId participant) participant)
                              :url (or (:avatarUrl participant) nil)
                              :size 20}]])])
               (when unread?
                 [:div.notification-badge
                  {:class (when highlight? "highlight")}
                  (if (> notif-count 99) "99+" notif-count)])]
              (when has-call?
                [:div.desktop-call-list.hide-on-mobile
                 {:style {:display "flex"
                          :flex-direction "column"
                          :padding-left (str (+ indent 24) "px")}}
                 (for [participant call-participants]
                   (let [p-id   (or (:userId participant) participant)
                         ;; Proper method seems to be
                         ;; (.memberAvatarUrl (.getRoom client id) participant)
                         ;; However, we need to build out the Member list for a
                         ;; Room first. That way we can just reference
                         ;; The generated list and not try
                         ;; To resolve a promise here
                         p-name (or (:displayName participant) p-id)
                         p-url  (or (:avatarUrl participant) nil)]
                     ^{:key (str "desktop-call-" p-id)}
                     [:div.call-participant-item
                      {:style {:display "flex"
                               :align-items "center"
                               :padding "4px 8px"
                               :gap "8px"
                               :cursor "pointer"}
                       :on-click (fn [e]
                                   (.stopPropagation e)
                                   (re-frame/dispatch [:ui/open-user-profile p-id]))}
                      [avatar {:id p-id :name p-name :url p-url :size 20}]
                      [:span {:style {:font-size "0.85rem"
                                      :color "var(--text-secondary)"
                                      :overflow "hidden"
                                      :text-overflow "ellipsis"
                                      :white-space "nowrap"}}
                       p-name]]))])]))))}]))


(defn room-list []
  (let [rooms          @(re-frame/subscribe [:rooms/current-view])
        active-room    @(re-frame/subscribe [:rooms/active-id])
        active-space-id   @(re-frame/subscribe [:spaces/active-id])
        active-space    @(re-frame/subscribe [:spaces/active-metadata])
        closed-drawers @(re-frame/subscribe [:rooms/closed-drawers])
        client          @(re-frame/subscribe [:sdk/client])
        room-array     (to-array rooms)]

    [:div.sidebar-rooms
     {:style {:display "flex" :flex-direction "column" :height "100%"}}
     [:h3.rooms-header {:style {:padding "8px"}}
      (if active-space
        [:<> [:h3 {:style {:margin 0 :font-size "1.1rem"}} (:name active-space)]])]
     (when-not active-space
       [filter-toggle-bar])
     (if (or (nil? room-array) (== (alength room-array) 0))
       [:div.empty-state "No rooms here..."]
       [:div.room-collection {:style {:flex 1 :min-height 0}}
        [virtualized-room-list client room-array active-space active-room closed-drawers]])]))