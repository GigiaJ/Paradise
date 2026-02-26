(ns auth.events
  (:require [re-frame.core :as re-frame]
            [reagent.core :as r]
            [reagent.dom.client :as rdom]
            [promesa.core :as p]
            [client.login :as login]
            [taoensso.timbre :as log]))

(re-frame/reg-sub
 :auth/status
 (fn [db _] (:auth-status db)))

(re-frame/reg-sub
 :auth/error
 (fn [db _] (:login-error db)))

(re-frame/reg-event-fx
 :app/bootstrap
 (fn [{:keys [db]} _]
   (do
     (log/debug "Bootstrapping")
     (bootstrap!
    (fn [client session-data]
      (if client
             (re-frame/dispatch [:auth/login-success client session-data])
             (re-frame/dispatch [:auth/login-failure nil])

        ))))
   {:db (assoc db :auth-status :checking)}))



(re-frame/reg-event-fx
 :auth/login
 (fn [{:keys [db]} [_ hs user pass]]
   (-> (login/login! hs user pass)
       (p/then (fn [client]
                 (re-frame/dispatch [:auth/login-success client nil])))
       (p/catch (fn [e]
                  (log/error "Login Failed" e)
                  (re-frame/dispatch [:auth/login-failure (.-message e)]))))
   {:db (assoc db :auth-status :authenticating
                  :login-error nil)}))

(re-frame/reg-event-fx
 :auth/login-success
 (fn [{:keys [db]} [_ client session-data]]
   (login/start-sync! client)
   (when session-data
     ;;(register-sw! (.-accessToken (.-session session-data)))
     (log/debug "Session restored!"))
   {:db (assoc db :auth-status :logged-in
                  :client client)}))

(re-frame/reg-event-db
 :auth/login-failure
 (fn [db [_ error-msg]]
   (assoc db :auth-status :logged-out
             :login-error error-msg)))

(defn login-screen []
  (let [fields (r/atom {:hs (or js/process.env.MATRIX_HOMESERVER "")
                        :user ""
                        :pass ""})]
    (fn []
      (let [error @(re-frame/subscribe [:auth/error])
            status @(re-frame/subscribe [:auth/status])]
        [:div.login-container.flex.flex-col.items-center.justify-center.h-screen.bg-gray-900
         [:h2.text-white.mb-4 "Paradise Login"]

         (when error
           [:div.text-red-500.mb-4 error])

         [:input.mb-2.p-2.rounded.bg-gray-700.text-white
          {:type "text" :placeholder "Homeserver" :value (:hs @fields)
           :on-change #(swap! fields assoc :hs (.. % -target -value))
           :disabled (= status :authenticating)}]

         [:input.mb-2.p-2.rounded.bg-gray-700.text-white
          {:type "text" :placeholder "Username"
           :on-change #(swap! fields assoc :user (.. % -target -value))
           :disabled (= status :authenticating)}]

         [:input.mb-2.p-2.rounded.bg-gray-700.text-white
          {:type "password" :placeholder "Password"
           :on-change #(swap! fields assoc :pass (.. % -target -value))
           :disabled (= status :authenticating)}]

         [:button.p-2.rounded.bg-blue-600.text-white.hover:bg-blue-500
          {:disabled (= status :authenticating)
           :on-click (fn [e]
                       (.preventDefault e)
                       (re-frame/dispatch [:auth/login (:hs @fields) (:user @fields) (:pass @fields)]))}
          (if (= status :authenticating) "Logging in..." "Login")]]))))