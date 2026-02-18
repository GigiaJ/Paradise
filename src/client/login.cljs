(ns client.login
  (:require
   [client.view-models :refer [create-room-list-vm]]
   [reagent.core :as r]
   [promesa.core :as p]
   [client.state :refer [sdk-world]]
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

(defn login! [hs user pass on-success on-rooms-update]
  (let [sdk-root (if (.-Client sdk) sdk (.-default sdk))
        ClientBuilder (.-ClientBuilder sdk-root)
        SSVBuilder (.-SlidingSyncVersionBuilder sdk-root)]
    (-> (p/let [
                builder (-> (new ClientBuilder)
                            (.slidingSyncVersionBuilder (.-DiscoverNative SSVBuilder))
                            (.serverNameOrHomeserverUrl hs)
                            (.inMemoryStore))
                client (.build builder)
                _ (.login ^js client user pass)]
          (let [version (.slidingSyncVersion ^js client)]
            (js/console.log "Negotiated Sync Version:" version))
          (start-sync! client on-success))
        (p/catch (fn [e] (js/console.error "Login Error:" e))))))
