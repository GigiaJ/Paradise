(ns client.login
  (:require
   [client.view-models :refer [create-room-list-vm]]
   [reagent.core :as r]
   [promesa.core :as p]
   [client.state :refer [sdk-world]]
  [client.session-store :refer [SessionStore]]
  [client.sdk-ctrl :as sdk-ctrl]
   ["generated-compat" :as sdk]
   ["@element-hq/web-shared-components" :refer [RoomListView BaseViewModel]])
  (:require-macros [macros :refer [ocall oget]])
  )

(defonce sdk-ready? (r/atom false))
  (defn init-sdk! []
    (-> (p/let [_ (sdk/uniffiInitAsync)]
          (js/console.log "WASM loaded")
          (reset! sdk-ready? true)
          (swap! sdk-world assoc :loading? false))
        (p/catch (fn [e]
                   (js/console.error "WASM Load Failed:" e)
                   (swap! sdk-world assoc :loading? false)))))

(defn start-sync! [client]
  (p/let [sync-service (-> (.syncService client) (.withOfflineMode) (.finish))
          rls-instance (.roomListService sync-service)
          room-list    (.allRooms rls-instance)]
    (let [rl-vm (create-room-list-vm #js {:client client :roomListService rls-instance})]
      (do
        (aset rl-vm "onUpdate"
              (fn [updates] (js/console.log "UPDATE TRIGGERED!" (alength updates))))
        (let [entries-result (.entriesWithDynamicAdapters room-list 200 rl-vm)]
            (aset rl-vm "entries_handle" (.entriesStream entries-result))
            (aset rl-vm "controller" (.controller entries-result)))
          (swap! sdk-world assoc-in [:vms :room-list] rl-vm)
          (.start sync-service)
          (.setRange  (.-controller rl-vm) 0 50)
          (.addOnePage (.-controller rl-vm))
          (js/console.log "Background stream handle secured. Syncing...")))))

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
                        (cond-> (nil? passphrase)
                          (.slidingSyncVersionBuilder (.-DiscoverNative SSVBuilder))))
              client  (.build builder)
              _ (restore-or-login! client)
              session (.session client)
              _ (or passphrase? (.save store session passphrase store-id))
              ]
        client)
      (p/catch (fn [e]
                 (js/console.error e)
                 (js/console.warn "Login failed, returning nil")
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

(defn bootstrap! []
  (p/let [_ (init-sdk!)
          data? (maybe-local-session)
          client (restore-client!
                  (.-session data?) (.-passphrase data?) (.-storeId data?))]
        (start-sync! client)))
