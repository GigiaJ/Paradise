(ns client.login
  (:require
   [taoensso.timbre :as log]
   [client.view-models :refer [create-room-list-vm]]
   [reagent.core :as r]
   [promesa.core :as p]
   [client.state :refer [sdk-world mount-vm! unmount-vm!]]
   [client.session-store :refer [SessionStore]]
   [client.sdk-ctrl :as sdk-ctrl]
   [room.room-list :as rl];;:refer [parse-room apply-diffs! create-room-update-listener setup-room-list-adapter!]]
   ["generated-compat" :as sdk :refer [RoomListEntriesDynamicFilterKind]]
   ["@element-hq/web-shared-components" :refer [RoomListView BaseViewModel]])
  (:require-macros [utils.macros :refer [ocall oget]]))

(defonce sdk-ready? (r/atom false))

(defn init-sdk! []
    (-> (p/let [_ (sdk/uniffiInitAsync)]
          (log/debug "WASM loaded")
          (reset! sdk-ready? true)
          (swap! sdk-world assoc :loading? false))
        (p/catch (fn [e]
                   (log/error "WASM Load Failed:" e)
                   (swap! sdk-world assoc :loading? false)))))

  (defn handle-room-selection [room-id]
    (swap! sdk-world assoc :active-room-id room-id)
    (unmount-vm! :active-timeline)
    (let [client (:client @sdk-world)
  ;;        raw-client (.-raw-client client)
;;          raw-room (ocall raw-client :getRoom room-id)
;;          raw-timeline-vm (new element-ui/TimelineViewModel #js {:room raw-room})

          ]
      (mount-vm! :active-timeline nil #_raw-timeline-vm)))

(defn start-sync! [client]
  (p/let [sync-service (-> (.syncService client) (.withOfflineMode) (.finish))
          rls-instance (.roomListService sync-service)
          room-list    (.allRooms rls-instance)]
    (let [raw-client (.-raw-client client)
          vm (rl/create-room-list-vm raw-client rls-instance room-list handle-room-selection)]
      (mount-vm! :room-list vm)
      (.start sync-service)
      (log/debug "Sync started."))))

(defn build-client [hs passphrase? store-id? restore-or-login!]
  (-> (p/let [
              ;; Rust internal components
              sdk-root (if (.-ClientBuilder sdk) sdk (.-default sdk))
              ClientBuilder (.-ClientBuilder sdk-root)
              SSVBuilder    (.-SlidingSyncVersionBuilder sdk-root)
              IDBBuilder    (.-IndexedDbStoreBuilder sdk-root)
              ;;
              store (SessionStore.)
              store-id   (or store-id? (.generateStoreId store))
              passphrase (or passphrase? (.generatePassphrase store))
              store-name (.getStoreName store store-id)
              store-config (-> (new IDBBuilder store-name)
                              (.passphrase passphrase))
              builder (-> (new ClientBuilder)
                        (.serverNameOrHomeserverUrl hs)
                        (.indexeddbStore store-config)
                        (.autoEnableCrossSigning true)
                        (cond-> (nil? passphrase?)
                          (.slidingSyncVersionBuilder (.-DiscoverNative SSVBuilder))))
              client  (.build builder)
              _ (restore-or-login! client)
              session (.session client)
              _ (or passphrase? (.save store session passphrase store-id))
              ]
        client)
      (p/catch (fn [e]
                 (log/error  e)
                 (log/warn "Login failed, returning nil")
                 nil))))

(defn login! [hs user pass]
   (p/let [client (build-client hs nil nil #(.login % user pass))]
           client))

(defn restore-client! [session passphrase store-id]
  (p/let [client (build-client (.-homeserverUrl session) passphrase store-id #(.restoreSession % session))]
    client))

(defn maybe-local-session []
  (p/let [store (SessionStore.)
          sessions (.loadSessions store)
          user-id (first (js/Object.keys sessions))]
    (or (aget sessions user-id) nil)))

(defn bootstrap! [on-complete]
  (-> (p/let [_      (init-sdk!)
              data?  (maybe-local-session)
              client (when data?
                       (restore-client! (.-session data?)
                                        (.-passphrase data?)
                                        (.-storeId data?)))]
        (when client (on-complete client)))
      (p/catch (fn [e]
                 (log/error "Bootstrap/Restore failed:" e)
                 (on-complete nil)))))