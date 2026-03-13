(ns service-worker-handler
  (:require
            [taoensso.timbre :as log]
            [re-frame.db :as db]
            [re-frame.core :as re-frame]))

(defn register-sw! [session]
  (when (exists? js/navigator.serviceWorker)
    (let [sw-container js/navigator.serviceWorker
          try-sync!    (fn []
                         (when (and (.-controller sw-container) session)
                           (re-frame/dispatch [:auth/sync-sw-only session])))]

      (-> (.register sw-container "/sw.js" #js {:type "module"})
          (.then (fn [reg]
                   (when (.-waiting reg)
                     (.postMessage (.-waiting reg) #js {:type "SKIP_WAITING"})))))
      (try-sync!)
      (.addEventListener sw-container "controllerchange"
                         (fn []
                           (log/debug "re-frame: SW Controller changed, syncing session...")
                           (try-sync!)))
      (.addEventListener sw-container "message"
                         (fn [event]
                           (let [data (.-data event)]
                             (when (= (.-type data) "NAVIGATE_TO_ROOM")
                               (let [room-id (.-room_id data)]
                                 (log/debug "SW requested navigation to room:" room-id)
                                 (re-frame/dispatch [:rooms/select room-id])))))))))



#_(defn register-sw! [session]
  (when (exists? js/navigator.serviceWorker)
    (let [sw-container js/navigator.serviceWorker
          try-sync!    (fn []
                         (when (and (.-controller sw-container) session)
                           (re-frame/dispatch [:auth/sync-sw-only session])))]

      (-> (.register sw-container "/sw.js" #js {:type "module"})
          (.then (fn [reg]
                   (when (.-waiting reg)
                     (.postMessage (.-waiting reg) #js {:type "SKIP_WAITING"})))))
      (try-sync!)
      (.addEventListener sw-container "controllerchange"
                         (fn []
                           (js/console.log "re-frame: SW Controller changed, syncing session...")
                           (try-sync!))))))

(re-frame/reg-event-fx
 :auth/sync-sw-only
 (fn [_ [_ session]]
   {:sync-sw-auth session}))

(re-frame/reg-fx
 :sync-sw-auth
 (fn [session]
   (if-let [sw-controller (.-controller js/navigator.serviceWorker)]
     (try
       (let [origin (.-origin (js/URL. (:homeserverUrl session)))
             payload (assoc session :origin origin)]
         (.postMessage sw-controller #js {:type "SET_SESSION"
                                          :session (clj->js payload)})
         (js/console.log "re-frame: Session synced for" (:userId session) "at" origin))
       (catch js/Error e
         (js/console.error "re-frame: Failed to parse homeserver URL" e)))
     (js/console.warn "re-frame: SW controller not found"))))