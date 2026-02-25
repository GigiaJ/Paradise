(ns client.core
  (:require
   [taoensso.timbre :as log]
   [utils.logger :as logger]
   [reagent.core :as r]
            [reagent.dom.client :as rdom]
            ["@element-hq/web-shared-components" :as element-ui :refer [RoomListView RoomListViewModel I18nContext I18nApi registerTranslations]]
            ["@vector-im/compound-web" :refer [TooltipProvider]]
            [client.login :as login]
            [client.i18n-map :as i18n-map]
            [client.ui :as ui]
            [re-frame.core :as re-frame]
            [room.room-list :as rl]
;;            [spaces.bar :refer [select-space!]]
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

(defn on-client-ready [raw-client]
  (if raw-client
    (p/let [_ (re-frame/dispatch-sync [:sdk/set-client raw-client])
            _ (login/start-sync! raw-client)]
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

(defn app []
  (let [world @sdk-world
        {:keys [client loading? snapshots vms active-room-id i18n]} world
        room-list-vm-instance (get-in vms [:room-list :instance])
        timeline-data (get-in snapshots [:active-timeline])]
;;    (js/console.log "Is component nil?" (nil? ui/element-room-list-view))


       (ui/login-screen handle-login-request)
    #_    [:div {:style {:display "flex" :flex-direction "row" :width "100vw" :height "100vh" :overflow "hidden"}
       :class "cpd-theme-dark mx_MatrixChat"}

     #_(cond
   loading? [:div "Loading Translations..."]
   (not i18n) [:div "Error: Translations failed to load."]
   :else
   [:> (.-Provider I18nContext) {:value i18n}
    [:> TooltipProvider
     ;; --- NEW SPACE RAIL ---
     [:aside {:className "mx_SpaceRail"
              :style {:width "72px" :background-color "#1e1f22" :display "flex" :flex-direction "column" :align-items "center" :padding-top "12px"}}
      (for [space (:spaces world)]
        (let [id (.-roomId space)
              ;; Fallback to ID if name is missing to prevent the crash
              name (or (.-name space) id "Unknown Space")
              avatar (.-avatarUrl space)]
          ^{:key id}
          [:div {:style {:width "48px" :height "48px" :margin-bottom "8px" :cursor "pointer"}
                 :on-click #(select-space! id)}
           (if (and avatar (not= avatar ""))
             [:img {:src avatar :style {:border-radius "50%" :width "100%" :height "100%"}}]
             [:div {:style {:border-radius "50%" :background "#313338" :color "white" 
                            :display "flex" :align-items "center" :justify-content "center" :height "100%"}}
              (if (seq name) (subs name 0 1) "?")])]))]
     (let [room-list-vm (get-in vms [:room-list])]
       (when room-list-vm
         [:nav {:className "mx_RoomList" :style {:width "240px"}}
          [:> RoomListView {:vm room-list-vm-instance
                            :renderAvatar ui/render-avatar}]]))

     ;; --- MAIN PANEL ---
     [:main.mx_MainPanel.flex-1.h-full
      [:div.flex.h-full.items-center.justify-center
       "Select a room"]]]])]))

(defonce root (atom nil))
(defn render! []
  (when-not @root
    (let [el (.getElementById js/document "root")]
      (reset! root (rdom/create-root el))))
  (rdom/render @root [app]))

(defn ^:export init []
(app/init)
(init-i18n!)
(logger/init!)
(log/debug  "Entering Paradise!")
(login/bootstrap! on-client-ready)

#_(render!)
  )

  (defn ^:after-load on-reload []
  (doseq [id (keys (:vms state/sdk-world))]
    (state/unmount-vm! id))
  (when-let [client (:client @state/sdk-world)]
  (log/debug "Disposing WASM Client...")
(state/dispose! client))
    (render!)
  (reset! state/sdk-world {:client nil
                         :vms {}
                         :snapshots {}
                         :loading? false
                         :active-room-id nil})
  (log/debug "State reset and memory cleared."))