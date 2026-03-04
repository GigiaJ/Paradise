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
            [client.diff-handler :refer [apply-matrix-diffs]]
            [utils.global-ui :refer [avatar]]
            ["generated-compat" :as sdk :refer [RoomListEntriesDynamicFilterKind RoomListFilterCategory RoomListLoadingState]])
  (:require-macros [utils.macros :refer [ocall oget]]))


(defn parse-room [space-service room-interface]
  (p/let [room-info     (if (fn? (.-roomInfo room-interface)) (.roomInfo room-interface) nil)
          latest-event  (.latestEvent room-interface)
          room-id       (.-id room-info)
          _ (log/debug latest-event)
           parents (if space-service
                    (.joinedParentsOfChild space-service room-id)
                    (p/resolved []))
          first-parent (get parents 0)
          first-parent-id (if first-parent (.-roomId first-parent) nil)
          ]
    (let [summary (build-room-summary room-interface room-info latest-event)]
      (aset summary "raw-room" room-interface)
      (aset summary "parents" parents)
      (log/debug summary)
      (aset summary "first-parent-id" first-parent-id)
      summary)))

(defonce !room-mutex (atom (p/resolved nil)))

(defn apply-global-diffs-async! [updates]
  (swap! !room-mutex
         (fn [prev-promise]
           (p/then prev-promise
                   (fn []
                     (let [db @re-frame.db/app-db
                           current-rooms (get db :rooms [])
                           space-service (:space-service db)]
                       (-> (apply-matrix-diffs current-rooms updates #(parse-room space-service %))
                           (p/then (fn [next-rooms]
                                     (re-frame/dispatch-sync [:sdk/set-global-rooms-sync next-rooms])
                                     (re-frame/dispatch [:sdk/set-global-rooms next-rooms])))
                           (p/catch (fn [err]
           (log/error "Global Diff Panic:" err)
           nil)))))))))

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

(defn start-room-list-sync! [room-list]
  (log/debug "Starting Room List Sync!")
  (let [entries-result (.entriesWithDynamicAdapters room-list 200
                         #js {:onUpdate #(re-frame/dispatch [:sdk/global-rooms-diff %])})]
    (re-frame/dispatch [:sdk/save-room-list-handle entries-result])
    (let [controller (.controller entries-result)
          default-filter (get-rust-filter "people")]
      (.setFilter controller default-filter)
      (.addOnePage controller))
    (let [loading-result (.loadingState room-list
                           #js {:onUpdate #(re-frame/dispatch [:sdk/room-list-loading %])})]
      (re-frame/dispatch [:sdk/room-list-loading (.-state loading-result)]))))

(defn distinct-by [f coll]
  (let [!seen (atom #{})]
    (filterv (fn [x]
               (let [k (f x)]
                 (if (contains? @!seen k)
                   false
                   (do (swap! !seen conj k)
                       true))))
             coll)))

(defn flatten-tree [rooms-map children-map closed-drawers parent-id depth]
  (let [sdk-children   (get children-map parent-id)
        manual-children (->> (vals rooms-map)
                             (filter #(= (:first-parent-id %) parent-id))
                              (map (fn [r] {:id (or (:id r) (:roomId r)) :is-space? (:isSpace r)}))
                              (vec))
        child-refs (->> (concat sdk-children manual-children)
                        (distinct-by :id)
                        (vec))]
    (reduce
      (fn [acc {:keys [id is-space?]}]
        (let [rich-data (get rooms-map id)
              item      (merge rich-data
                               {:id id
                                :is-space? is-space?
                                :depth depth
                                :name (or (:name rich-data) "Loading...")})
              acc-with-item (conj acc item)]
          (if (and is-space? (not (contains? closed-drawers id)))
            (into acc-with-item (flatten-tree rooms-map children-map closed-drawers id (inc depth)))
            acc-with-item)))
      []
      child-refs)))



(re-frame/reg-sub
 :rooms/active-id
 (fn [db _]
   (:active-room-id db)))

(re-frame/reg-sub
 :rooms/all
 (fn [db _]
   (let [rooms (:rooms db)]
     (if (map? rooms) (vec (vals rooms)) (vec (or rooms []))))))

(re-frame/reg-sub
 :space-rooms
 (fn [db _]
   (vec (or (:space-rooms db) []))))

(re-frame/reg-sub
 :rooms/active-metadata
 :<- [:rooms/active-id]
 :<- [:rooms/all]
 :<- [:space-rooms]
 (fn [[active-id all-rooms space-rooms] _]
   (when active-id
     (let [all-known (into all-rooms space-rooms)]
       (some (fn [r]
               (let [rid (or (:id r)
                             (try (.-roomId r) (catch :default _ nil))
                             (try (.-id r) (catch :default _ nil)))]
                 (when (= rid active-id) r)))
             all-known)))))

(re-frame/reg-sub
 :rooms/map
 :<- [:rooms/all]
 (fn [rooms-list _]
   (into {}
         (for [room rooms-list]
           (let [r  (js->clj room :keywordize-keys true)
                 id (or (:id r) (:roomId r))]
             [id r])))))

(re-frame/reg-sub
 :rooms/indexed-map
 :<- [:rooms/all]
 (fn [rooms-list _]
   (into {}
         (for [room rooms-list]
           (let [r  (js->clj room :keywordize-keys true)
                 id (or (:id r) (:roomId r))]
             [id r])))))

(re-frame/reg-sub
 :rooms/ordered-list
 :<- [:rooms/all]
 (fn [rooms-list _]
   (mapv #(js->clj % :keywordize-keys true) rooms-list)))


(re-frame/reg-sub
 :rooms/current-view
 :<- [:spaces/active-id]
 :<- [:rooms/ordered-list]
 :<- [:rooms/indexed-map]
 :<- [:space-children/map]
 :<- [:rooms/closed-drawers]
 (fn [[active-id ordered-list indexed-map children-map closed-drawers] _]
   (if-not active-id
     ordered-list
     (flatten-tree indexed-map children-map closed-drawers active-id 0))))

#_(re-frame/reg-sub
 :rooms/current-view
 :<- [:spaces/active-id]
 :<- [:rooms/ordered-list]
 :<- [:rooms/indexed-map]
 :<- [:room-list/active-filter]
 :<- [:space-children/map]
 :<- [:rooms/closed-drawers]
 (fn [[active-id ordered-list indexed-map active-filter children-map closed-drawers] _]
   (cond
     (= active-filter "people")
     ordered-list
     :else
     (flatten-tree indexed-map children-map closed-drawers active-id 0))))

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

(re-frame/reg-event-fx
 :sdk/global-rooms-diff
 (fn [_ [_ updates]]
   (apply-global-diffs-async! updates)
   {}))

(re-frame/reg-event-db
 :sdk/set-global-rooms-sync
 (fn [db [_ rooms]]
   (assoc db :rooms rooms)))

(re-frame/reg-event-fx
 :sdk/set-global-rooms
 (fn [_ [_ rooms]]
   (let [top-room-ids (take 2 (map #(.-id %) rooms))]
     {:dispatch [:sdk/preload-timelines top-room-ids]})))

(re-frame/reg-event-db
 :sdk/room-list-loading
 (fn [db [_ state-obj]]
   (assoc db :rooms-loading? (= "NotLoaded" (.-tag state-obj)))))

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


(re-frame/reg-event-fx
 :rooms/select
 (fn [{:keys [db]} [_ room-id]]
   (let [current-room (:active-room-id db)]
     (if (= current-room room-id)
       {:db (assoc-in db [:ui :sidebar-open?] false)}
       {:db (-> db
                (assoc :active-room-id room-id)
                (assoc-in [:ui :sidebar-open?] false))
        :dispatch-n (remove nil?
                            [(when current-room [:sdk/cleanup-timeline current-room])
                             [:sdk/boot-timeline room-id]
                             [:composer/load-draft room-id]])}))))

(re-frame/reg-event-db
 :sdk/hydrate-rooms
 (fn [db [_ js-rooms]]
   (let [rooms (js->clj js-rooms :keywordize-keys true)
         rooms-map (into {} (for [r rooms]
                              [(or (:id r) (:roomId r)) r]))]
     (assoc db :rooms rooms-map))))


(re-frame/reg-event-fx
 :sdk/restore-global-list
 (fn [{:keys [db]} _]
   (let [global-rooms (vals (:rooms db))]
     {:db (assoc db :space-rooms (vec global-rooms))})))

(re-frame/reg-event-db
 :sdk/save-room-list-handle
 (fn [db [_ result]]
   (assoc db
     :room-list-result result
     :room-list-controller (.controller result))))

(re-frame/reg-event-db
 :sdk/save-room-list-controller
 (fn [db [_ controller]]
   (assoc db :room-list-controller controller)))

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
         controller     (:room-list-controller db)]
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

(defn virtualized-room-list [room-array space-id active-room closed-drawers]
  (let [active-filter @(re-frame/subscribe [:room-list/active-filter])]
    [:> Virtuoso
     {:style {:height "100%" :width "100%"}
      :data room-array
      :endReached #(re-frame/dispatch [:room-list/paginate-global])
      :itemContent
      (fn [index room]
        (r/as-element
         (let [{:keys [id name is-space? depth notification-count]} room
               avatar-url (:avatar room)
               _ (log/debug room)
               depth   (or depth 0)
               indent  (* depth 12)
               _ (js/console.log is-people?)
               is-closed? (contains? closed-drawers id)]
           (if is-space?
             [:div.room-drawer-header
              {:style {:padding-left (str indent "px")}
               :class (when is-closed? "collapsed")
               :on-click #(re-frame/dispatch [:rooms/toggle-drawer id])}
              [:span.drawer-arrow "▼"]
              [:span.drawer-name (str/upper-case name)]]
             [:div.room-item
              {:style {:padding-left (str indent "px")}
               :class (when (= id active-room) "active")
               :on-click #(re-frame/dispatch [:rooms/select id])}
              (if (= active-filter "people")
                 [avatar {:id id :name name :url avatar-url :size 24 :status :online}]
                 [:span.room-hash "# "])
              [:span.room-name name]
              (when (> (or notification-count 0) 0)
                [:div.badge notification-count])]))))}]))

(defn room-list []
  (let [rooms          @(re-frame/subscribe [:rooms/current-view])
        active-room    @(re-frame/subscribe [:rooms/active-id])
        active-space-id   @(re-frame/subscribe [:spaces/active-id])
        active-space    @(re-frame/subscribe [:spaces/active-metadata])
        closed-drawers @(re-frame/subscribe [:rooms/closed-drawers])
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
        [virtualized-room-list room-array active-space active-room closed-drawers]])]))