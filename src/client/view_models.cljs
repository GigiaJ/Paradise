(ns client.view-models
  (:require ["@element-hq/web-shared-components" :refer [BaseViewModel]]
            [goog.object :as g]
            [utils.logger :as log]
            [client.state :refer [sdk-world]]
           ))

(defn create-room-list-vm [props]
  (let [initial-state #js {:isLoadingRooms true
                           :isRoomListEmpty true
                           :roomIds #js []
                           :filterIds #js ["unread" "people" "rooms"]}]
    (let [vm (new BaseViewModel props initial-state)]
      (g/extend vm
        #js {:onToggleFilter (fn [id] (log/debug "Filter toggled:" id))
             :createChatRoom (fn [] (log/debug "Create DM"))
             :createRoom     (fn [] (log/debug "Create Room"))
             :getRoomItemViewModel (fn [id]
                                     nil)
             :updateVisibleRooms (fn [start end]
                                   (log/debug "Scroll range:" start end))})
      vm)))

(defn mount-vm!
  "Plugs an SDK ViewModel into our global brain."
  [id raw-vm]
  (let [update-snap! (fn []
                       (let [snap (.getSnapshot raw-vm)
                             clj-data (js->clj snap :keywordize-keys true)]
                         (swap! sdk-world assoc-in [:snapshots id] clj-data)))
        unsub (.subscribe raw-vm update-snap!)]
    (update-snap!)
    (swap! sdk-world assoc-in [:vms id]
           {:instance raw-vm
            :unsub unsub
            :dispose (fn []
                       (unsub)
                       (.dispose raw-vm))})
    (log/debug (str "Mounted VM: " (name id)))))

(defn unmount-vm! 
  "Safely unplugs a ViewModel and clears its memory."
  [id]
  (when-let [vm-map (get-in @sdk-world [:vms id])]
    ((:dispose vm-map))
    (swap! sdk-world update :vms dissoc id)
    (swap! sdk-world update :snapshots dissoc id)
    (log/debug (str "Unmounted VM: " (name id)))))

;; Testing shadow-cljs tangling. Failed.
;; Now?
;; test
