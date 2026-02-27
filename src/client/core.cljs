(ns client.core
  (:require
   [taoensso.timbre :as log]
   [utils.logger :as logger]
   [reagent.core :as r]
            [reagent.dom.client :as rdom]
            [client.login :as login]
            [client.i18n-map :as i18n-map]
            [client.ui :as ui]
            [re-frame.core :as re-frame]
            [service-worker-handler :refer [register-sw!]]
            [room.room-list :as rl]
            [client.state :as state :refer [sdk-world]]
            [client.view-models :refer [mount-vm! unmount-vm!]]
            [promesa.core :as p]
            [app :as app]
            [client.timeline :as timeline])
  (:require-macros [utils.macros :refer [ocall oget]])
  )


  #_(defn on-client-ready [raw-client]
  (p/let [
;; should probably check for null client here and if null prompt login
          _ (state/set-client! raw-client)

          wrapped-client (:client state/sdk-world)
          _ (login/start-sync! raw-client)
          ;;         _  (setup-room-list! wrapped-client)
          ]))

(re-frame/reg-event-db
 :sdk/set-client
 (fn [db [_ raw-client]]
   (assoc db :client raw-client)))

(re-frame/reg-sub
 :sdk/client
 (fn [db _]
   (:client db)))

(defn on-client-ready [raw-client session-json]
  (if raw-client
    (p/let [_ (re-frame/dispatch-sync [:sdk/set-client raw-client])
            _ (login/start-sync! raw-client)
            _ (register-sw! (.-accessToken (.-session session-json)))]
      nil)
    #_(re-frame/dispatch [:auth/prompt-login])))

(defn setup-room-list! [client]
  (let [rls-service (-> client .-raw-client .roomListService)
        raw-client  (.-raw-client client)
        vm (rl/create-room-list-vm raw-client rls-service handle-room-selection)]

    (state/mount-vm! :room-list vm)
    (swap! state/sdk-world assoc :loading? false)))

  (defn handle-login-request [hs user pass]
    (swap! sdk-world assoc :loading? true)
    (login/login! hs user pass))

  (defn handle-room-selection [room-id]
    (swap! sdk-world assoc :active-room-id room-id)
    (unmount-vm! :active-timeline)
    (let [client (:client @sdk-world)
          raw-client (.-raw-client client)
          raw-room (ocall raw-client :getRoom room-id)
          raw-timeline-vm (new element-ui/TimelineViewModel #js {:room raw-room})]
      (mount-vm! :active-timeline raw-timeline-vm)))




(defn load-lang! [lang]
  (let [;; Try specific lang, then base lang, then hard fallback
        base-lang (first (clojure.string/split lang #"_"))
        url (or (get i18n-map/urls lang)
                (get i18n-map/urls base-lang)
                (get i18n-map/urls "en_EN"))]
    (log/debug "Fetching translation from:" url)
    (-> (p/promise (js/fetch url))
        (p/then #(.json %))
        (p/then #(element-ui/registerTranslations lang %)))))

(defn create-i18n-api []
  (p/let [api (element-ui/I18nApi.)
          raw-lang (oget api :language)
          current-lang (case raw-lang
                         "en" "en_EN"
                         "fr" "fr_FR"
                         raw-lang)
          _ (load-lang! current-lang)
          ]
    (log/info "Translations loaded for:" current-lang)
    api))

(defn init-i18n! []
  (-> (p/let [api (create-i18n-api)]
        (swap! sdk-world assoc :i18n api))
      (p/catch #(log/error % "Failed to ignite the I18n engine"))))

(defonce root (atom nil))
(defn render! []
  (when-not @root
    (let [el (.getElementById js/document "root")]
      (reset! root (rdom/create-root el))))
  (rdom/render @root [app]))

(defn ^:export init []
(app/init)
;;(init-i18n!)
(logger/init!)
(log/debug  "Entering Paradise!")
;;(login/bootstrap! on-client-ready)

#_(render!)
  )