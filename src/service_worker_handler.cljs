(ns service-worker-handler
  (:require
            [taoensso.timbre :as log]
            [re-frame.db :as db]
            [re-frame.core :as re-frame]))

(defn register-sw! [token]
  (when (exists? js/navigator.serviceWorker)
    (log/debug "Attaching Service Worker")
    (-> (js/navigator.serviceWorker.register "/sw.js" #js {:type "module"})
        (.then (fn [reg]
                 (when (.-waiting reg)
                   (.postMessage (.-waiting reg) #js {:type "SKIP_WAITING"}))
                 (when (and (.-controller js/navigator.serviceWorker) token)
                   (re-frame/dispatch [:auth/sync-sw-only token])))))))

(re-frame/reg-event-fx
 :auth/sync-sw-only
 (fn [_ [_ token]]
   {:sync-sw-auth token}))

(re-frame/reg-event-fx
 :auth/save-session
 (fn [{:keys [db]} [_ {:keys [access-token user-id]}]]
   {:db (assoc db :access-token access-token :user-id user-id)
    :sync-sw-auth access-token}))

(re-frame/reg-fx
 :sync-sw-auth
 (fn [token]
   (if-let [sw-controller (.-controller js/navigator.serviceWorker)]
     (do
       (.postMessage sw-controller #js {:type "SET_TOKEN" :token token})
       (js/console.log "re-frame: Token synced to Service Worker"))
     (js/console.warn "re-frame: SW controller not found, token not synced"))))