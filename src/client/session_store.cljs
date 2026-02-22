(ns client.session-store
(:require [promesa.core :as p]
          [utils.logger :as log]
          ["generated-compat" :as sdk]))

(def ^:private storage-key "mx_session_v3")

(defn- get-session-class []
  ;; Use the exact same root-finding logic that worked in login.cljs!
  (let [sdk-root (if (.-Session sdk) sdk (.-default sdk))]
    (if sdk-root
      (.-Session sdk-root)
      (log/error "FATAL: Could not find Session class on root SDK object."))))

(defn- load-raw-sessions-js []
(let [stored (.getItem js/localStorage storage-key)]
(if stored
(.parse js/JSON stored)
#js {})))

(defn- save-raw-sessions-js! [sessions-obj]
(.setItem js/localStorage storage-key (.stringify js/JSON sessions-obj)))

(defn generate-passphrase []
(let [array (js/Uint8Array. 32)]
(.getRandomValues js/crypto array)
(js/btoa (.apply js/String.fromCharCode nil array))))

(defn- generate-uuid []
  (if (and (exists? js/crypto) (exists? (.-randomUUID js/crypto)))
    (.randomUUID js/crypto)
    (let [template "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"]
      (.replace template 
                (js/RegExp. "[xy]" "g") 
                (fn [c]
                  (let [r (bit-or (* (js/Math.random) 16) 0)
                        v (if (= c "x") r (bit-or (bit-and r 0x3) 0x8))]
                    (.toString v 16)))))))

(defn- delete-store-impl! [store-id]
(let [store-name (str "closura-store-" store-id)]
(js/Promise. (fn [resolve _]
(let [request (.deleteDatabase js/indexedDB store-name)]
(set! (.-onsuccess request) #(resolve))
(set! (.-onerror request) #(resolve))
(set! (.-onblocked request) #(resolve)))))))

(defn- load-sessions-sync-impl []
(let [sessions (load-raw-sessions-js)
      Session (get-session-class)]
(when Session
(doseq [user-id (js/Object.keys sessions)]
(let [data (aget sessions user-id)]
(aset sessions user-id
#js {:session (.new Session (aget data "session"))
:passphrase (aget data "passphrase")
:storeId (aget data "storeId")}))))
sessions))

(defn- save-session-impl! [session passphrase store-id]
(let [user-id (.-userId session)
sessions (load-raw-sessions-js)
existing (aget sessions user-id)
final-pass (or passphrase (when existing (aget existing "passphrase")))
final-id   (or store-id   (when existing (aget existing "storeId")))]

(when (and final-pass final-id)
  (aset sessions user-id #js {:session session
                              :passphrase final-pass
                              :storeId final-id})
  (save-raw-sessions-js! sessions))))

(defn- clear-session-impl! [user-id]
(let [sessions (load-raw-sessions-js)
data (aget sessions user-id)]
(p/do
(when-let [sid (and data (aget data "storeId"))]
(delete-store-impl! sid))
  (js-delete sessions user-id)
  (save-raw-sessions-js! sessions))))

(deftype SessionStore []
Object
(loadSessions [this]
(load-sessions-sync-impl))

(save [this session passphrase store-id]
(save-session-impl! session passphrase store-id))

(generatePassphrase [this]
(generate-passphrase))

(generateStoreId [this]
    (generate-uuid))

(getStoreName [this store-id]
(str "closura-store-" store-id))

(clear [this user-id]
;; Return a promise to the caller so they can await the cleanup
(clear-session-impl! user-id)))