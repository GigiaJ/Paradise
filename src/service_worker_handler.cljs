(ns service-worker-handler
  (:require
            [taoensso.timbre :as log]
            [re-frame.db :as db]
            [re-frame.core :as re-frame]))

(defn register-sw! [session]
  (when (exists? js/navigator.serviceWorker)
    (-> (js/navigator.serviceWorker.register "/sw.js" #js {:type "module"})
        (.then (fn [reg]
                 (when (.-waiting reg)
                   (.postMessage (.-waiting reg) #js {:type "SKIP_WAITING"}))
                 (when (and (.-controller js/navigator.serviceWorker) session)
                   (re-frame/dispatch [:auth/sync-sw-only session])))))))

(re-frame/reg-event-fx
 :auth/sync-sw-only
 (fn [_ [_ session]]
   {:sync-sw-auth session}))

(re-frame/reg-event-fx
 :auth/save-session
 (fn [{:keys [db]} [_ {:keys [access-token user-id homeserver]}]]
   {:db (assoc db :access-token access-token :user-id user-id :homeserver homeserver)
    :sync-sw-auth {:token access-token :homeserver homeserver}}))

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