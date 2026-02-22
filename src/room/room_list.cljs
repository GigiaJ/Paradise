(ns room.room-list
  (:require [promesa.core :as p]
            [utils.logger :as log]
            ;; We need to add RoomListItemViewModel
            ["generated-compat" :as sdk :refer [RoomListEntriesDynamicFilterKind RoomListLoadingState]]
            ["@element-hq/web-shared-components" :refer [BaseViewModel]]))

(defn random-string [length]
  (let [chars "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"]
    (apply str (repeatedly length #(rand-nth chars)))))

(defn create-room-item-vm [room-data client open-room-fn]
  (let [is-unread (.-is_unread room-data)
        initial-snapshot
        #js {:id (.-id room-data)
             :room #js {:id (.-id room-data)
                        :name (.-name room-data)
                        :avatar nil}
             :name (random-string 16);; (.-name room-data)
             :isBold is-unread
             :messagePreview nil ;; We can wire this up later using latest-event
             :notification #js {:hasAnyNotificationOrActivity is-unread
                                :isUnsentMessage false
                                :invited false
                                :isMention false
                                :isActivityNotification false
                                :isNotification is-unread
                                :hasUnreadCount is-unread
                                :count 0
                                :muted false}
             :showMoreOptionsMenu false ;; true
             :showNotificationMenu false ;; true
             :isFavourite false
             :isLowPriority false
             :canInvite true
             :canCopyRoomLink true
             :canMarkAsRead is-unread
             :canMarkAsUnread (not is-unread)
             :roomNotifState 0}
        vm (new BaseViewModel #js {} initial-snapshot)]
    (js/Object.defineProperties vm
      (clj->js
       {:onOpenRoom {:value (fn []
                              (log/debug "Opening room:" (.-id room-data))
                              (open-room-fn (.-id room-data)))}
        :onMarkAsRead        {:value (fn [] (log/debug "Mark read" (.-id room-data)))}
        :onMarkAsUnread      {:value (fn [] (log/debug "Mark unread" (.-id room-data)))}
        :onToggleFavorite    {:value (fn [] (log/debug "Toggle fav" (.-id room-data)))}
        :onToggleLowPriority {:value (fn [] (log/debug "Toggle low pri" (.-id room-data)))}
        :onInvite            {:value (fn [] (log/debug "Invite" (.-id room-data)))}
        :onCopyRoomLink      {:value (fn [] (log/debug "Copy link" (.-id room-data)))}
        :onLeaveRoom         {:value (fn [] (log/debug "Leave room" (.-id room-data)))}
        :onSetRoomNotifState {:value (fn [state] (log/debug "Set notif state:" state))}

        :updateSummary
        {:value (fn [new-room-data]
                  (let [new-unread? (.-is_unread new-room-data)]
                    (.merge (.-snapshot vm)
                            #js {:name            (.-name new-room-data)
                                 :isBold          new-unread?
                                 :canMarkAsRead   new-unread?
                                 :canMarkAsUnread (not new-unread?)
                                 :notification    (js/Object.assign
                                                    #js {}
                                                    (.-notification (.-snapshot vm))
                                                    #js {:hasUnreadCount new-unread?
                                                         :isNotification new-unread?
                                                         :hasAnyNotificationOrActivity new-unread?})})))}
        }))
    vm))

(defn- get-rust-filter [filter-id]
  (let [dedup (RoomListEntriesDynamicFilterKind.DeduplicateVersions.)]
    (case filter-id
      "unread"
      (RoomListEntriesDynamicFilterKind.All.
       #js {:filters #js [(RoomListEntriesDynamicFilterKind.Unread.) dedup]})
      "favourite"
      (RoomListEntriesDynamicFilterKind.All.
       #js {:filters #js [(RoomListEntriesDynamicFilterKind.Favourite.) dedup]})
      "people"
      (RoomListEntriesDynamicFilterKind.All.
       #js {:filters #js [(RoomListEntriesDynamicFilterKind.Category. #js {:expect 1}) ;; 1 = People
                          (RoomListEntriesDynamicFilterKind.Joined.)
                          dedup]})
      "rooms"
      (RoomListEntriesDynamicFilterKind.All.
       #js {:filters #js [(RoomListEntriesDynamicFilterKind.Category. #js {:expect 2}) ;; 2 = Group
                          (RoomListEntriesDynamicFilterKind.Joined.)
                          dedup]})
      "low_priority"
      (RoomListEntriesDynamicFilterKind.All.
       #js {:filters #js [(RoomListEntriesDynamicFilterKind.LowPriority.)
                          (RoomListEntriesDynamicFilterKind.Joined.)
                          dedup]})
      (RoomListEntriesDynamicFilterKind.All.
       #js {:filters #js [(RoomListEntriesDynamicFilterKind.NonLeft.) dedup]}))))


(defn- parse-room [room-interface]
  (p/let [room-info    (.roomInfo room-interface)
          latest-event (.latestEvent room-interface)]
    #js {:id          (.id room-interface)
         :raw_room    room-interface
         :name        (.-name room-info)
         :is_unread   (.-isUnread room-info)
         :latest_event latest-event}))

(defn- apply-diffs! [vm state-atom updates]
  (p/let [current-rooms (:rooms @state-atom)
          next-rooms
          (p/loop [i 0
                   rooms current-rooms]
            (if (< i (alength updates))
              (let [update (aget updates i)
                    tag    (.-tag update)
                    inner  (.-inner update)]
                (p/let [new-rooms
                        (case tag
                          "Reset"
                          (p/let [parsed (p/all (map parse-room (.-values inner)))]
                            (vec parsed))

                          "Set"
                          (p/let [parsed (parse-room (.-value inner))]
                            (assoc rooms (.-index inner) parsed))

                          "PushBack"
                          (p/let [parsed (parse-room (.-value inner))]
                            (conj rooms parsed))

                          "PushFront"
                          (p/let [parsed (parse-room (.-value inner))]
                            (into [parsed] rooms))

                          "Clear"
                          []

                          "PopFront"
                          (vec (rest rooms))

                          "PopBack"
                          (pop rooms)

                          "Insert"
                          (p/let [parsed (parse-room (.-value inner))
                                  idx    (.-index inner)]
                            (vec (concat (subvec rooms 0 idx) [parsed] (subvec rooms idx))))

                          "Remove"
                          (let [idx (.-index inner)]
                            (vec (concat (subvec rooms 0 idx) (subvec rooms (inc idx)))))

                          "Truncate"
                          (vec (take (.-length inner) rooms))
                          (do (log/warn "Unhandled tag:" tag) rooms))]
                  (p/recur (inc i) new-rooms)))
              rooms))]
    (swap! state-atom assoc :rooms next-rooms)
    (let [vms (:vms @state-atom)]
      (doseq [room next-rooms]
        (when-let [child-vm (get vms (.-id room))]
          (when (exists? (.-updateSummary child-vm))
            (.updateSummary child-vm room)))))
    (let [current-ids (set (map #(.-id %) next-rooms))
          dead-ids    (remove current-ids (keys (:vms @state-atom)))]
      (doseq [dead-id dead-ids]
        (when-let [dead-vm (get-in @state-atom [:vms dead-id])]
          (.dispose dead-vm))
        (swap! state-atom update :vms dissoc dead-id)))
    (let [js-ids (clj->js (map #(.-id %) next-rooms))]
      (.merge (.-snapshot vm)
              #js {:roomIds js-ids
                   :isRoomListEmpty (= 0 (alength js-ids))}))))

(defn- create-room-update-listener []
  #js {:onUpdate
       (fn [updates]
         (log/debug "UPDATE TRIGGERED! Count:" (alength updates))
         (let [first-update (aget updates 0)
               tag          (if first-update (.-tag first-update) nil)
               inner        (if first-update (.-inner first-update) nil)]
           (when tag
             (log/debug "Diff Tag:" tag))
           (when (= tag "Reset")
             (let [rooms-array (.-values inner)]
               (log/debug "Total rooms in this diff:" (.-length rooms-array))
               (when (> (.-length rooms-array) 0)
                 (log/debug "First Room ID:" (.id (aget rooms-array 0)))))))
         (apply-diffs! updates sdk-world)
         (js/Promise.resolve nil))})


(defn create-room-list-vm
  "Creates a fully-hydrated RoomListViewModel."
  [client room-list-service room-list open-room-fn]
  (let [initial-snapshot #js {:isLoadingRooms true
                              :isRoomListEmpty true
                              :filterIds #js ["unread" "people" "rooms" "favourite" "low_priority" "default"]
                              :activeFilterId nil
                              :roomListState #js {:activeRoomIndex nil :spaceId nil :filterKeys nil}
                              :roomIds #js []
                              :canCreateRoom true}
        props #js {:client client
                   :roomListService room-list-service
                   :openRoom open-room-fn}
        vm (new BaseViewModel props initial-snapshot)
        state (atom {:rooms [] :vms {} :has-setup-entries? false :controller nil :diff-queue (p/resolved nil)})
        setup-entries!
        (fn []
          (try
            (when-not (:has-setup-entries? @state)
              (swap! state assoc :has-setup-entries? true)
              (let [entries-result (.entriesWithDynamicAdapters room-list 200 #js {:onUpdate (.-onUpdate vm)})
                    controller     (.controller entries-result)]
                (swap! state assoc :controller controller)
                (.track (.-disposables vm)
                        (fn [] (when-let [s (.entriesStream entries-result)] (.cancel s))))

                (let [non-left   (RoomListEntriesDynamicFilterKind.NonLeft.)
                      dedup      (RoomListEntriesDynamicFilterKind.DeduplicateVersions.)
                      filter-all (RoomListEntriesDynamicFilterKind.All. #js {:filters #js [non-left dedup]})]
                  (.setFilter controller filter-all))
                (.addOnePage controller)))
            (catch :default e
              (log/error "CRASH IN SETUP ENTRIES:" e))))
        handle-loading!
        (fn [loading-state]
          (try
            (if (= "NotLoaded" (.-tag loading-state))
              (.merge (.-snapshot vm) #js {:isLoadingRooms true})
              (do
                (.merge (.-snapshot vm) #js {:isLoadingRooms false})
                (setup-entries!)))
            (catch :default e
              (log/error "CRASH IN LOADING STATE CALLBACK:" e))))]

    (js/Object.defineProperties vm
      (clj->js
       {:onUpdate
        {:value (fn [updates]
                  (swap! state update :diff-queue
                         #(p/then % (fn [] (apply-diffs! vm state updates)))))}

        :onToggleFilter
        {:value (fn [filter-id]
                  (let [current (:active-filter @state)
                        new-filter (if (= current filter-id) nil filter-id)]
                    (swap! state assoc :active-filter new-filter)
                    (when-let [ctrl (:controller @state)]
                      (.setFilter ctrl (get-rust-filter (or new-filter "default"))))
                    (.merge (.-snapshot vm) #js {:activeFilterId new-filter})))}

        :getRoomItemViewModel
        {:value (fn [room-id]
                  (or (get-in @state [:vms room-id])
                      (let [room-data (first (filter #(= (.-id %) room-id) (:rooms @state)))]
                        (if-not room-data
                          (throw (js/Error. (str "Room " room-id " not found in internal list.")))

                          (let [child-vm (create-room-item-vm room-data client open-room-fn)]
                            (swap! state assoc-in [:vms room-id] child-vm)
                            child-vm)))))}

        #_:getRoomItemViewModel
        #_{:value (fn [room-id]
                  (or (get-in @state [:vms room-id])
                      (let [room-data (first (filter #(= (.-id %) room-id) (:rooms @state)))]
                        (if-not room-data
                          (throw (js/Error. (str "Room " room-id " not found in internal list.")))
                          (let [child-vm (new RoomListItemViewModel room-data client open-room-fn)]
                            (swap! state assoc-in [:vms room-id] child-vm)
                            child-vm)))))}
        :setActiveRoom
        {:value (fn [room-id]
                  (let [idx (first (keep-indexed #(when (= (.-id %2) room-id) %1) (:rooms @state)))]
                    (.merge (.-snapshot vm)
                            #js {:roomListState
                                 (js/Object.assign #js {}
                                                   (.-roomListState (.getSnapshot vm))
                                                   #js {:activeRoomIndex idx})})))}

        :updateVisibleRooms {:value (fn [start end] nil)}
        :createChatRoom     {:value (fn [] nil)}
        :createRoom         {:value (fn [] nil)}}))

    (let [loading-result (.loadingState room-list
                                        #js {:onUpdate (fn [state] (handle-loading! state))})]
      (.track (.-disposables vm)
              (fn [] (when-let [s (.-stateStream loading-result)] (.cancel s))))
      (handle-loading! (.-state loading-result)))
    vm))