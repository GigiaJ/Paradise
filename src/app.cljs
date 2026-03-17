(ns app
  (:require
   [re-frame.core :as re-frame]
   [taoensso.timbre :as log]
   [promesa.core :as p]
   [reagent.core :as r]
   [reagent.dom.client :as rdom]
   [navigation.spaces.bar :refer [spaces-sidebar]]
   [overlays.settings :refer [settings-modal]]
   [container.timeline.base :refer [timeline]]
   [overlays.lightbox :refer [image-lightbox]]
   [container.call.call-container :refer [persistent-call-container]]
   [container.call.call-view :refer [call-view]]
   [auth.events :refer [login-screen]]
   [input.emotes :refer [emoji-sticker-board]]
   [utils.global-ui :refer [global-reaction-picker global-context-menu satellite-overlay]]
   [client.login :refer [bootstrap!]]
   [navigation.rooms.room-list :refer [room-list]]
   [container.call.events]
   [container.call.core]
   ))

#_(def default-db
  {:spaces {"!space1:example.com" {:id "!space1:example.com" :name "Main Space" :parent-id nil}
            "!space2:example.com" {:id "!space2:example.com" :name "Sub Space" :parent-id "!space1:example.com"}
            "!space3:example.com" {:id "!space3:example.com" :name "Other Space" :parent-id nil}}
   :rooms {"!room1:example.com" {:id "!room1:example.com" :name "general" :parent-id "!space1:example.com"}
           "!room2:example.com" {:id "!room2:example.com" :name "random" :parent-id "!space1:example.com"}
           "!room3:example.com" {:id "!room3:example.com" :name "cljs-dev" :parent-id "!space2:example.com"}}
   :active-space-id "!space1:example.com"
   :active-room-id "!room1:example.com"})

(def default-db
  {:spaces {}
   :rooms  {}
   :active-space-id nil
   :active-room-id  nil
   :auth-status :checking
   :login-error nil
   :client nil
   })

(re-frame/reg-event-db
 :initialize-db
 (fn [_ _]
   default-db))

#_(re-frame/reg-sub
 :auth/status
 (fn [db _] (:auth-status db)))

#_(re-frame/reg-sub
 :auth/error
 (fn [db _] (:login-error db)))

(re-frame/reg-event-db
 :ui/set-sidebar
 (fn [db [_ open?]]
   (assoc-in db [:ui :sidebar-open?] open?)))

(re-frame/reg-event-db
 :ui/toggle-sidebar
 (fn [db _]
   (update-in db [:ui :sidebar-open?] not)))

(re-frame/reg-sub
 :ui/sidebar-open?
 (fn [db _]
   (get-in db [:ui :sidebar-open?] false)))

#_
(re-frame/reg-event-db
 :ui/set-main-focus
 (fn [db [_ focus]]
   (assoc db :main-focus focus)))

#_
(re-frame/reg-event-db
 :ui/set-side-panel
 (fn [db [_ panel]]
   (assoc db :side-panel panel)))

#_(re-frame/reg-sub
 :ui/main-focus
 (fn [db _]
   (:main-focus db :timeline)))

#_
(re-frame/reg-sub
 :ui/side-panel
 (fn [db _]
   (:side-panel db nil)))

(re-frame/reg-event-db
 :ui/window-resized
 (fn [db [_ width]]
   (assoc-in db [:ui :mobile?] (< width 768))))

(re-frame/reg-sub
 :ui/mobile?
 (fn [db _]
   (get-in db [:ui :mobile?] false)))




(re-frame/reg-fx
 :ui/hotswap-css
 (fn [new-filename]
   (let [link (.getElementById js/document "style")]
     (if (and link (= (.-rel link) "stylesheet"))
       (do
         (set! (.-href link) new-filename)
         (log/info "Swapped CSS to:" new-filename))
       (log/error "Could not find stylesheet link with ID 'style'")))))


(re-frame/reg-event-fx
 :ui/switch-theme
 (fn [{:keys [db]} [_ theme-name]]
   (let [filename (case theme-name
                    :discord "cordlike.css"
                    :matrix  "matrix.css"
                    :retro   "retro.css"
                    "app.css")]
     {:db (assoc db :ui/current-theme theme-name)
      :ui/hotswap-css (str "css/" filename)})))

#_(defn call-view []
  [:div.call-view {:style {:padding "20px" :background "#222" :color "#fff" :height "100%"}}
   [:h2 "Active Call"]
   [:button {:on-click #(re-frame/dispatch [:ui/set-main-focus :timeline])} "End Call"]])

(defn thread-view []
  [:div.thread-view {:style {:padding "20px" :height "100%"}}
   [:h2 "Thread Context"]
   [:button {:on-click #(re-frame/dispatch [:ui/set-main-focus :timeline])} "Back to Timeline"]])

(defn member-list []
  [:div.member-list-wrapper
   [:ul.member-items
    [:li "@alice:matrix.org"]
    [:li "@bob:matrix.org"]]])

(defn thread-list []
  [:div.thread-list {:style {:padding "10px"}}
   [:h3 "Active Threads"]
   [:div "Thread 1..."]
  [:div "Thread 2..."]])

(defn booting-screen []
  [:div.boot-container
   [:div.boot-content
    [:div.boot-logo-wrapper
     [:div.paradise-logo "P"]]
    [:div.boot-loading-text
     [:span "Taking you to Paradise"]
     [:span.dot-one "."]
     [:span.dot-two "."]
     [:span.dot-three "."]]]])

#_(defn main-layout []
  [:div.app-root
   [element-call-test]])

#_(defn main-layout []
  (let [
        auth-status   @(re-frame/subscribe [:auth/status])
        sidebar-open? @(re-frame/subscribe [:ui/sidebar-open?])
        main-focus    @(re-frame/subscribe [:container/main-focus])
        side-panel    @(re-frame/subscribe [:container/side-panel])
        active-room   @(re-frame/subscribe [:rooms/active-id])]
    (case auth-status
      :checking [booting-screen]
      (:logged-out :authenticating) [login-screen]
      :logged-in
      [:<>
       [persistent-call-container]

       [:div.app-root {:class (when sidebar-open? "sidebars-open")}
        [spaces-sidebar]
        [room-list]

        (when sidebar-open?
          [:div.mobile-overlay {:on-click #(re-frame/dispatch [:ui/set-sidebar false])}])

        [:div.room-layout
         {:style {:display "grid"
                  :flex "1"
                  :min-width "0"
                  :grid-template-columns (if side-panel "1fr 350px" "1fr")
                  :height "100%"}}

         [:div.main-content
          (case main-focus
            :call     [call-view active-room]
            :thread   [thread-view]
            :timeline [timeline])]

         (when-let [panel side-panel]
           [:div.sidebar
            {:style {:display "flex"
                     :flex-direction "column"
                     :height "100%"
                     :background "var(--surface-1)"
                     :border-left "1px solid var(--border-color)"}}
            (when (contains? #{:members :threads :search :pins :timeline} panel)
              [:div.sidebar-header
               {:style {:display "flex"
                        :align-items "center"
                        :justify-content "space-between"
                        :padding "0 16px"
                        :height "48px"
                        :border-bottom "1px solid var(--border-color)"}}
               [:h3.sidebar-title
                {:style {:font-size "0.9rem" :text-transform "uppercase" :letter-spacing "0.05rem"}}
                (case panel
                  :members "Members"
                  :threads "Threads"
                  :search  "Search"
                  :pins    "Pinned Messages"
                  :timeline "")]
               [:button.sidebar-close
                {:style {:background "transparent" :border "none" :color "var(--text-secondary)" :cursor "pointer"}
                 :on-click #(re-frame/dispatch [:container/set-side-panel nil])}
                "✕"]])

            [:div.sidebar-content
             {:style {:flex 1 :overflow "hidden"}}
             (case panel
               :timeline [timeline :compact? true :hide-header? true]
               :members  [member-list]
               :threads  [thread-list]
      ;;:search   [search-view]
      ;;:pins     [pins-view]
               )]])

         #_(when-let [panel side-panel]
             [:div.sidebar
              [:div.sidebar-header
               #_[:h3.sidebar-title
                  (case panel
                    :timeline "Room Chat"
                    :members "Members"
                    :threads "Threads")]
               [:button.sidebar-close {:on-click #(re-frame/dispatch [:ui/set-side-panel nil])} "✕"]]

              [:div.sidebar-content
               (case panel
                 :timeline [timeline :compact? false]
                 :members  [member-list]
                 :threads  [thread-list])]])]]

       [settings-modal]
       [global-context-menu]
;;       [global-reaction-picker]
       [image-lightbox]]
      [:div "Unknown State"])))

(defn main-layout []
  (let [auth-status   @(re-frame/subscribe [:auth/status])
        sidebar-open? @(re-frame/subscribe [:ui/sidebar-open?])
        main-focus    @(re-frame/subscribe [:container/main-focus])
        side-panel    @(re-frame/subscribe [:container/side-panel])
        active-room   @(re-frame/subscribe [:rooms/active-id])]
    (case auth-status
      :checking [booting-screen]
      (:logged-out :authenticating) [login-screen]
      :logged-in
      [:<>
       [persistent-call-container]

       [:div.app-root {:class (when sidebar-open? "sidebars-open")}
        [spaces-sidebar]
        [room-list]

        (when sidebar-open?
          [:div.mobile-overlay {:on-click #(re-frame/dispatch [:ui/set-sidebar false])}])

        [:div.room-layout
         {:style {:display "grid"
                  :flex "1"
                  :min-width "0"
                  :grid-template-columns (if side-panel "1fr 350px" "1fr")
                  :height "100%"}}

         [:div.main-content
          (case main-focus
            :call     [call-view active-room]
            :thread   [thread-view]
            :timeline [timeline])]

         (when-let [panel side-panel]
           [:div.sidebar
            {:style {:display "flex"
                     :flex-direction "column"
                     :height "100%"
                     :background "var(--surface-1)"
                     :border-left "1px solid var(--border-color)"}}
            (when (contains? #{:members :threads :search :pins :timeline} panel)
              [:div.sidebar-header
               {:style {:display "flex"
                        :align-items "center"
                        :justify-content "space-between"
                        :padding "0 16px"
                        :height "48px"
                        :border-bottom "1px solid var(--border-color)"}}
               [:h3.sidebar-title
                {:style {:font-size "0.9rem" :text-transform "uppercase" :letter-spacing "0.05rem"}}
                (case panel
                  :members "Members"
                  :threads "Threads"
                  :search  "Search"
                  :pins    "Pinned Messages"
                  :timeline "")]
               [:button.sidebar-close
                {:style {:background "transparent" :border "none" :color "var(--text-secondary)" :cursor "pointer"}
                 :on-click #(re-frame/dispatch [:container/set-side-panel nil])}
                "✕"]])

            [:div.sidebar-content
             {:style {:flex 1 :overflow "hidden"}}
             (case panel
               :timeline [timeline :compact? true :hide-header? true]
               :members  [member-list]
               :threads  [thread-list]
      ;;:search   [search-view]
      ;;:pins     [pins-view]
               )]])

         #_(when-let [panel side-panel]
             [:div.sidebar
              [:div.sidebar-header
               #_[:h3.sidebar-title
                  (case panel
                    :timeline "Room Chat"
                    :members "Members"
                    :threads "Threads")]
               [:button.sidebar-close {:on-click #(re-frame/dispatch [:ui/set-side-panel nil])} "✕"]]

              [:div.sidebar-content
               (case panel
                 :timeline [timeline :compact? false]
                 :members  [member-list]
                 :threads  [thread-list])]])]]

       [settings-modal]
       [global-context-menu]

       [satellite-overlay
          (case active-type
            :emoji-picker emoji-sticker-board
            :user-info    user-summary-card
            nil)]

;;       [global-reaction-picker]
       [image-lightbox]]
      [:div "Unknown State"])))




(defn init-window-size-listener! []
  (re-frame/dispatch [:ui/window-resized (.-innerWidth js/window)])

  (let [resize-handler (goog.functions/debounce
                        #(re-frame/dispatch [:ui/window-resized (.-innerWidth js/window)])
                        150)]
    (.addEventListener js/window "resize" resize-handler)))


(defonce root (atom nil))

(defn mount-root []
 (re-frame/dispatch [:ui/switch-theme])
  (re-frame/clear-subscription-cache!)
  (let [container (.getElementById js/document "root")]
    (when-not @root
      (reset! root (rdom/create-root container)))
    (init-window-size-listener!)
    (.render @root (r/as-element [main-layout]))))

(defn ^:export init []
  (re-frame/dispatch-sync [:initialize-db])
  (let [params  (js/URLSearchParams. js/window.location.search)
        room-id (.get params "room")]
    (re-frame/dispatch [:app/bootstrap])
    (when room-id
      (js/console.log "App started with room-id:" room-id)
      (re-frame/dispatch [:rooms/select room-id])
      (let [new-url (.. js/window -location -pathname)]
        (.replaceState js/window.history #js {} "" new-url))))
  (mount-root))

#_(defn ^:export init []
  (re-frame/dispatch-sync [:initialize-db])
  (re-frame/dispatch [:app/bootstrap])
   (mount-root))


(defn ^:after-load re-render []
  (mount-root))