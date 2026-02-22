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
            [room.room-list :as rl]
            [client.state :as state :refer [sdk-world]]
            [client.view-models :refer [mount-vm! unmount-vm!]]
            [promesa.core :as p]
            [client.timeline :as timeline])
  (:require-macros [utils.macros :refer [ocall oget]]))

(defn on-client-ready [raw-client]
  (p/let [
;; should probably check for null client here and if null prompt login
          _ (state/set-client! raw-client)
          wrapped-client (:client state/sdk-world)
          _ (login/start-sync! raw-client)
          ;;         _  (setup-room-list! wrapped-client)
          ]))

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
  (let [url (get i18n-map/urls lang (get i18n-map/urls "en"))]
    (-> (js/fetch url)
        (.then #(.json %))
        (.then #(element-ui/registerTranslations lang %)))))

(defn create-i18n-api []
  (p/let [api (element-ui/I18nApi.)
          current-lang (.-language api)
          _ (load-lang! current-lang)]
    (log/info "Translations loaded for:" current-lang)
    api))

(defonce i18n-state (r/atom {:loading? true :api nil}))

(defn init-i18n! []
  (try
    (log/info "Triggered")
    (let [api (create-i18n-api)]
      (reset! i18n-state {:loading? false :api api}))
    (catch :default e
      (js/console.error "Manual I18n init failed" e))))

(defn app []
  (let [world @sdk-world
        {:keys [client loading? snapshots vms active-room-id api]} world
        room-list-vm-instance (get-in vms [:room-list :instance])
        timeline-data (get-in snapshots [:active-timeline])]
    (js/console.log "Is component nil?" (nil? ui/element-room-list-view))
;;    [:div.h-screen.flex.bg-gray-900.text-white
    (cond
       loading? [:div "Loading Translations..."]
       (not api) [:div "Error: Translations failed to load."]
       :else
       [:> I18nContext.Provider {:value api}
        [:div.cpd-theme-dark.cpd-dark.mx_MatrixChat.h-screen
    [:> TooltipProvider
     [:div.flex.items-center.justify-center.w-full.h-full
        [:span.text-xl.animate-pulse "Connecting to Matrix..."]]
       ;;client
       [:<>
        (let [room-list-vm (get-in vms [:room-list])]
          (when room-list-vm
            [:> RoomListView {:vm room-list-vm-instance :renderAvatar ui/render-avatar}]))
        (if active-room-id
          [ui/room-view active-room-id timeline-data]
          [:div.flex-1.flex.items-center.justify-center.text-gray-500
           "Select a room to start chatting"])]
       ;;:else
       ;;[ui/login-screen handle-login-request]
     ]
         ]
             ]
    )))

(defonce root (atom nil))
(defn render! []
  (when-not @root
    (let [el (.getElementById js/document "app")]
      (reset! root (rdom/create-root el))))
  (rdom/render @root [app]))

(defn ^:export init []
  (init-i18n!)
  (logger/init!)
  (log/debug  "Entering Paradise!")
  (login/bootstrap! on-client-ready)
  (render!))

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