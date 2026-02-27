(ns spaces.bar
  (:require [promesa.core :as p]
            [re-frame.core :as re-frame]
            [re-frame.db :as db]
            [reagent.core :as r]
            ["react-virtuoso" :refer [Virtuoso]]
            [client.state :as state :refer [sdk-world]]
            [client.diff-handler :refer [apply-matrix-diffs]]
            [room.room-list :refer [parse-room]]
            [utils.helpers :refer [mxc->url]]
            [taoensso.timbre :as log]))

(defn apply-space-diffs! [space-id updates]
  (let [current-rooms (get-in @re-frame.db/app-db [:space-rooms space-id] [])]
    (-> (apply-matrix-diffs current-rooms updates identity)
        (.then (fn [next-rooms]
                 (re-frame/dispatch [:sdk/update-space-view space-id next-rooms])))
        (.catch #(js/console.error "Space Diff Panic for" space-id ":" %)))))


(defn init-space-service! [client]
  (try
    (let [space-service (.spaceService client)
          listener #js {:onUpdate
                        (fn [spaces-array]
                          _ (js/console.log spaces-array)
                          (re-frame/dispatch [:sdk/process-spaces space-service spaces-array])
                          )
                        }]
     (re-frame/dispatch-sync [:sdk/set-space-service space-service])
      (p/let [initial-spaces (.joinedSpaces space-service)
              _ (re-frame/dispatch [:sdk/process-spaces space-service initial-spaces])
              sub (.subscribeToJoinedSpaces space-service listener)]
        (re-frame/dispatch [:sdk/set-global-space-sub sub])
        ))
    (catch :default e
      (log/error "Failed to wake up SpaceService:" e))))

(re-frame/reg-event-db
 :sdk/set-global-space-sub
 (fn [db [_ sub-handle]]
   (assoc db :global-space-sub sub-handle)))

(re-frame/reg-event-fx
 :sdk/process-spaces
 (fn [{:keys [db]} [_ space-service js-spaces]]
   (let [spaces (js->clj js-spaces :keywordize-keys true)
         new-spaces-map (into {} (for [s spaces
                                       :let [id (or (:id s) (:roomId s))]
                                       :when id]
                                   [id s]))]
     (js/console.log js-spaces)
     (log/debug spaces)
     (if (and (empty? new-spaces-map) (not-empty (:spaces db)))
       (do
         (log/debug "Ignoring suspicious empty space update during sync")
         {})
       (let [existing-subs (or (:space-subs db) {})
             new-space-ids (remove #(contains? existing-subs %) (keys new-spaces-map))]
         {:db (assoc db :spaces new-spaces-map)
          :dispatch-n (for [id new-space-ids]
                        [:sdk/boot-background-space-list space-service id])})))))


(re-frame/reg-event-fx
 :sdk/boot-background-space-list
 (fn [_ [_ service space-id]]
   (-> (.spaceRoomList service space-id)
       (.then (fn [space-list]
                (let [initial-rooms (.rooms space-list)
                      listener #js {:onUpdate (fn [diffs]
                          (apply-space-diffs! space-id diffs))}]
                  (try
                    (p/let [sub-handle (.subscribeToRoomUpdate space-list listener)
                            _ (re-frame/dispatch [:sdk/save-space-sub space-id space-list sub-handle])
                            _ (.paginate space-list)]
                      (re-frame/dispatch [:sdk/hydrate-space-rooms space-id (.rooms space-list)]))
                    (catch :default e
                      (js/console.error "FFI Subscription Panic:" e))))))
       (.catch (fn [err]
                 (js/console.error "Failed to boot space list for" space-id ":" err))))
   {}))

(re-frame/reg-event-fx
 :sdk/paginate-space
 (fn [{:keys [db]} [_ space-id]]
   (let [space-sub (get-in db [:space-subs space-id])
         space-list (:list space-sub)]
     (when space-list
       (.paginate space-list))
     {})))

(re-frame/reg-sub
 :spaces/all
 (fn [db _]
   (vals (:spaces db))))

(re-frame/reg-sub
 :spaces/active-id
 (fn [db _]
   (:active-space-id db)))


(re-frame/reg-sub
 :space-rooms-map
 (fn [db _]
   (or (:space-rooms db) {})))

(re-frame/reg-event-db
 :sdk/hydrate-spaces
 (fn [db [_ js-spaces]]
   (let [spaces (js->clj js-spaces :keywordize-keys true)
         new-spaces-map (into {} (for [s spaces
                                       :let [id (or (:id s) (:roomId s))]
                                       :when id]
                                   [id s]))]
     (update db :spaces merge new-spaces-map))))

(re-frame/reg-event-db
 :sdk/hydrate-space-rooms
 (fn [db [_ space-id js-rooms]]
   (let [rooms (js->clj js-rooms :keywordize-keys true)
         current-spaces (get db :space-rooms {})
         safe-spaces (if (map? current-spaces) current-spaces {})]
     (assoc db :space-rooms (assoc safe-spaces space-id (vec rooms))))))


(re-frame/reg-event-db
 :sdk/save-space-sub
 (fn [db [_ space-id handle]]
   (assoc-in db [:space-subs space-id] handle)))

(re-frame/reg-event-db
 :space/select
 (fn [db [_ space-id]]
   (-> db
       (assoc :active-space-id space-id)
       (assoc :active-room-id nil))))

(re-frame/reg-event-db
 :sdk/update-space-view
 (fn [db [_ space-id rooms]]
   (let [current-spaces (get db :space-rooms {})
         safe-spaces (if (map? current-spaces) current-spaces {})]
     (assoc db :space-rooms (assoc safe-spaces space-id rooms)))))

(re-frame/reg-event-db
 :sdk/set-space-service
 (fn [db [_ service]]
   (assoc db :space-service service)))


(defn virtualized-space-bar [spaces active-space-id]
  (let [space-array (to-array spaces)]
    [:> Virtuoso
     {:style {:height "100%" :width "100%"}
      :data space-array
      :itemContent (fn [index space]
                     (r/as-element
                      (let [id (or (:roomId space) (:id space))
                            raw-avatar (:avatarUrl space)
                            avatar (when raw-avatar (mxc->url raw-avatar))
                            name (or (:displayName space) "?")]
                        [:div.space-icon-wrapper
                         {:class (when (= id active-space-id) "active")
                          :on-click #(re-frame/dispatch [:space/select id])
                          :title name}
                         (if avatar
                           [:img.space-icon {:src avatar}]
                           [:div.space-icon-placeholder
                            (subs (or name "S") 0 2)])])))}]))

(defn spaces-sidebar []
  (let [spaces @(re-frame/subscribe [:spaces/all])
        active-id @(re-frame/subscribe [:spaces/active-id])]
    [:div.sidebar-spaces
     [:div.space-icon-wrapper {:class (when-not active-id "active")}
      [:div.space-icon.home-btn
       {:on-click #(re-frame/dispatch [:space/select nil])}
       "🏠"]]
     [:div.sidebar-divider]
     [:div.spaces-list-container
      {:style {:flex 1 :width "100%" :min-height 0}}
      [virtualized-space-bar spaces active-id]]]))