(ns room.room-list
  (:require [promesa.core :as p]
            [re-frame.core :as re-frame]
            [taoensso.timbre :as log]
            [re-frame.db :as db]
            ["react-virtuoso" :refer [Virtuoso]]
            [promesa.core :as p]
            [reagent.core :as r]
            [reagent.dom.client :as rdom]
            [room.room-summary :refer [build-room-summary]]
            [client.diff-handler :refer [apply-matrix-diffs]]
            ["generated-compat" :as sdk :refer [RoomListEntriesDynamicFilterKind RoomListLoadingState]])
  (:require-macros [utils.macros :refer [ocall oget]]))


(defn- parse-room [room-interface]
  (p/let [room-info     (.roomInfo room-interface)
          latest-event  (.latestEvent room-interface)
          room-id       (.-id room-info)]
    (let [summary (build-room-summary room-interface room-info latest-event)]
      (aset summary "raw_room" room-interface)
      summary)))

(defn apply-global-diffs-async! [updates]
  (let [current-rooms (get @re-frame.db/app-db :global-rooms [])]
    (-> (apply-matrix-diffs current-rooms updates #(parse-room %))
        (.then (fn [next-rooms]
                 (re-frame/dispatch [:sdk/set-global-rooms next-rooms])))
        (.catch #(js/console.error "Global Diff Panic:" %)))))

(defn start-room-list-sync! [room-list]
  (let [entries-result (.entriesWithDynamicAdapters room-list 200
                         #js {:onUpdate #(re-frame/dispatch [:sdk/global-rooms-diff %])})
        controller (.controller entries-result)
        non-left (RoomListEntriesDynamicFilterKind.NonLeft.)
        dedup (RoomListEntriesDynamicFilterKind.DeduplicateVersions.)
        filter-all (RoomListEntriesDynamicFilterKind.All. #js {:filters #js [non-left dedup]})]
    (.setFilter controller filter-all)
    (.addOnePage controller)
    (let [loading-result (.loadingState room-list
                           #js {:onUpdate #(re-frame/dispatch [:sdk/room-list-loading %])})]
      (re-frame/dispatch [:sdk/room-list-loading (.-state loading-result)]))))

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
 :rooms/current-view
 :<- [:spaces/active-id]
 :<- [:space-rooms-map]
 :<- [:rooms/all]
 (fn [[active-id space-rooms-map all-rooms] _]
   (if active-id
     (get space-rooms-map active-id [])
     all-rooms)))

(re-frame/reg-sub
 :rooms/active-metadata
 :<- [:rooms/active-id]
 :<- [:rooms/all]
 :<- [:space-rooms]
 (fn [[active-id all-rooms space-rooms] _]
   (when active-id
     (let [all-known (into all-rooms space-rooms)]
       (some (fn [r]
               (let [rid (or (try (.-roomId r) (catch :default _ nil))
                             (try (.-id r) (catch :default _ nil))
                             (:roomId r)
                             (:id r))]
                 (when (= rid active-id) r)))
             all-known)))))

(re-frame/reg-event-fx
 :sdk/global-rooms-diff
 (fn [_ [_ updates]]
   (apply-global-diffs-async! updates)
   {}))

(re-frame/reg-event-db
 :sdk/set-global-rooms
 (fn [db [_ rooms]]
   (assoc db :rooms rooms)))

(re-frame/reg-event-db
 :sdk/room-list-loading
 (fn [db [_ state-obj]]
   (assoc db :rooms-loading? (= "NotLoaded" (.-tag state-obj)))))

(re-frame/reg-event-fx
 :room/select
 (fn [{:keys [db]} [_ room-id]]
   (let [current-room (:active-room-id db)]
     (if (= current-room room-id)
       {}
       {:db (assoc db :active-room-id room-id)
        :dispatch-n (if current-room
                      [[:sdk/cleanup-timeline current-room]
                       [:sdk/boot-timeline room-id]]
                      [[:sdk/boot-timeline room-id]])}))))

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


(defn virtualized-room-list [room-array space-id active-room]
  [:> Virtuoso
   {:style {:height "100%" :width "100%"}
    :data room-array
    :endReached #(when space-id (re-frame/dispatch [:sdk/paginate-space space-id]))
    :computeItemKey (fn [index room]
                      (if room
                        (or (.-roomId room) (.-id room) index)
                        index))
    :itemContent (fn [index room]
                   (r/as-element
                    (if room
                      (let [id   (or (.-roomId room) (.-id room))
                            name (or (.-displayName room) (.-name room) "Unknown Room")]
                        (when id
                          [:div.room-item
                           {:class (when (= id active-room) "active")
                            :key id
                            :on-click #(re-frame/dispatch [:room/select id])}
                           [:span.room-hash "# "]
                           [:span.room-name name]]))
                      [:div "Loading..."])))}])

(defn room-list []
  (let [rooms @(re-frame/subscribe [:rooms/current-view])
        active-room @(re-frame/subscribe [:rooms/active-id])
        active-space @(re-frame/subscribe [:spaces/active-id])
        room-array (to-array rooms)] 
    [:div.sidebar-rooms
     {:style {:display "flex" :flex-direction "column" :height "100%"}}
     [:h3.rooms-header "Rooms"]
     (if (or (nil? room-array) (== (alength room-array) 0))
       [:div.empty-state "No rooms here..."]
       [:div.room-collection {:style {:flex 1 :min-height 0}}
        [virtualized-room-list room-array active-space active-room]])]))