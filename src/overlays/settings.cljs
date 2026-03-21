(ns overlays.settings
  (:require
   [promesa.core :as p]
   [re-frame.core :as re-frame]
   [re-frame.db :as db]
   [reagent.core :as r]
   ["react-virtuoso" :refer [Virtuoso]]
;;   [client.state :as state :refer [sdk-world]]
   [client.diff-handler :refer [apply-matrix-diffs]]
   [navigation.rooms.room-list :refer [parse-room]]
   [utils.global-ui :refer [click-away-wrapper global-context-menu]]
   [utils.helpers :refer [mxc->url]]
   [taoensso.timbre :as log]
   [utils.macros :refer [config]]))

(re-frame/reg-sub
 :sdk/profile
 (fn [db _]
   (get db :current-user {:user-id "Loading..."
                          :display-name "Loading..."
                          :avatar-url nil})))

(re-frame/reg-event-fx
 :sdk/fetch-own-profile
 (fn [{:keys [db]} _]
   (let [client (:client db)]
     (when client
       (p/let [user-id      (.userId client)
               display-name (.displayName client)
               avatar-url   (.avatarUrl client)]
         (re-frame/dispatch [:sdk/set-own-profile
                             {:user-id      user-id
                              :display-name display-name
                              :avatar-url   avatar-url}])))
     {})))

(re-frame/reg-event-db
 :sdk/set-own-profile
 (fn [db [_ profile]]
   (assoc db :current-user profile)))


(re-frame/reg-event-fx
 :settings/open
 (fn [{:keys [db]} _]
   {:db (assoc db :settings/open? true)
    :fx [[:dispatch [:settings/load-accounts]]]}))

(re-frame/reg-event-db
 :settings/close
 (fn [db _]
   (assoc db :settings/open? false)))

(re-frame/reg-sub
 :settings/is-open?
 (fn [db _]
   (:settings/open? db false)))

(re-frame/reg-event-db
 :settings/set-tab
 (fn [db [_ tab-id]]
   (assoc db :settings/active-tab tab-id)))

(re-frame/reg-sub
 :settings/active-tab
 (fn [db _]
   (:settings/active-tab db :my-account)))

(re-frame/reg-fx
 :matrix/recover-session
 (fn [{:keys [client recovery-key]}]
   (let [encryption-module (.encryption client)]
     (-> (.recover encryption-module recovery-key)
         (p/then (fn [_]
                   (log/info "Session successfully verified and recovered!")
                   (re-frame/dispatch [:sdk/verification-success])))
         (p/catch (fn [e]
                    (log/error "Verification failed:" e)
                    (re-frame/dispatch [:sdk/verification-error (.-message e)])))))))

(re-frame/reg-event-fx
 :sdk/submit-verification
 (fn [{:keys [db]} [_ recovery-key]]
   (let [client (:client db)]
     (if client
       {:db (assoc db :verification/status :verifying
                      :verification/error nil)
        :matrix/recover-session {:client client :recovery-key recovery-key}}
       (log/error "Cannot verify: No client active")))))

(re-frame/reg-event-db
 :sdk/verification-success
 (fn [db _]
   (assoc db :verification/status :verified
             :verification/error nil)))

(re-frame/reg-event-db
 :sdk/verification-error
 (fn [db [_ err-msg]]
   (assoc db :verification/status :error
             :verification/error err-msg)))

(re-frame/reg-sub
 :verification/status
 (fn [db _] (:verification/status db :unverified)))

(re-frame/reg-sub
 :verification/error
 (fn [db _] (:verification/error db)))



(defn sidebar-profile-mini []
  (let [profile @(re-frame/subscribe [:sdk/profile])]
    [:div.sidebar-profile-mini
     [:div.profile-trigger
      {:style {:user-select "none"}
       :on-click (fn [e]
                   (.preventDefault e)
                   (re-frame/dispatch [:settings/open]))
       :on-context-menu (fn [e]
                          (.preventDefault e)
                          (re-frame/dispatch
                           [:context-menu/open
                            {:x (.-clientX e)
                             :y (.-clientY e)
                             :items [{:id "status" :label "Set Status" :action #(js/console.log "Status")}
                                     {:id "copy"   :label "Copy ID" :action #(js/console.log "Copied")}
                                     {:id "logout" :label "Log Out" :action #(re-frame/dispatch [:sdk/logout]) :class-name "danger"}]}]))}
      (if (:avatar-url profile)
        [:img.profile-avatar {:src (mxc->url (:avatar-url profile))}]
        [:div.avatar-placeholder (subs (or (:display-name profile) "?") 0 1)])
      [:div.status-dot]]]))

(defn verification-tab []
  (r/with-let [!passphrase (r/atom "")]
    (let [status        @(re-frame/subscribe [:verification/status])
          error         @(re-frame/subscribe [:verification/error])
          is-verifying? (= status :verifying)
          is-empty?     (empty? @!passphrase)]
      [:div.settings-section
       [:h2.verification-title "Device Verification"]
       (if (= status :verified)
         [:div.success-banner
          [:div.success-icon "✅"]
          [:div
           [:div.success-title "Session Verified"]
           [:div.success-subtitle "Your end-to-end encrypted messages are now unlocked."]]]
         [:<>
          [:p.verification-description
           "Enter your Security Key or Recovery Passphrase to verify this session and unlock encrypted messages."]
          [:div.verification-form
           [:label.form-label "Security Phrase / Key"]
           [:input.form-input
            {:class     (when error "is-invalid")
             :type      "password"
             :value     @!passphrase
             :on-change #(reset! !passphrase (.. % -target -value))
             :disabled  is-verifying?
             :placeholder "Enter your phrase..."}]
           (when error
             [:div.form-error (str "Error: " error)])
           [:button.form-button
            {:class    (when is-verifying? "is-verifying")
             :on-click #(re-frame/dispatch [:sdk/submit-verification @!passphrase])
             :disabled (or is-empty? is-verifying?)}
            (if is-verifying?
              "Verifying..."
              "Verify Session")]]])])))

(defn settings-sidebar [active-tab]
  [:div.settings-sidebar
   [:div.settings-group-label "User Settings"]
   [:div.settings-tab
    {:class (when (= active-tab :my-account) "is-active")
     :on-click #(re-frame/dispatch [:settings/set-tab :my-account])}
    "My Account"]
   [:div.settings-tab
    {:class (when (= active-tab :verification) "is-active")
     :on-click #(re-frame/dispatch [:settings/set-tab :verification])}
    "Verification"]
   [:div.settings-tab
    {:class (when (= active-tab :accounts) "is-active")
     :on-click #(re-frame/dispatch [:settings/set-tab :accounts])}
    "Accounts"]
   [:div.settings-tab
    {:class (when (= active-tab :notifications) "is-active")
     :on-click #(re-frame/dispatch [:settings/set-tab :notifications])}
    "Notifications"]
   [:div.settings-group-label {:style {:margin-top "1rem"}} "App"]
   [:div.settings-tab
    {:class (when (= active-tab :about) "is-active")
     :on-click #(re-frame/dispatch [:settings/set-tab :about])}
    "About"]])



(defn my-account-tab [profile]
  [:<>
   [:h2.settings-heading "My Account"]
   [:div.profile-card
    (if (:avatar-url profile)
      [:img.profile-avatar-large {:src (mxc->url (:avatar-url profile))}]
      [:div.profile-avatar-placeholder-large])
    [:div.profile-info
     [:div.profile-name (or (:display-name profile) "Unknown User")]
     [:div.profile-id (:user-id profile)]]]])

(defn settings-modal []
  (let [is-open?   @(re-frame/subscribe [:settings/is-open?])
        active-tab @(re-frame/subscribe [:settings/active-tab])
        profile    @(re-frame/subscribe [:sdk/profile])]
    (when is-open?
      [:div.settings-backdrop
       {:on-click #(re-frame/dispatch [:settings/close])}
       [:div.settings-window
        {:on-click #(.stopPropagation %)}
        [settings-sidebar active-tab]
        [:div.settings-content
         [:div.close-button
          {:on-click #(re-frame/dispatch [:settings/close])}
          [:span "✕"]
          [:span.esc-text "ESC"]]
         (case active-tab
           :my-account   [my-account-tab profile]
           :verification [verification-tab]
           [:div {:style {:color "#fff"}} "Tab not found"])]]])))

(defn url-base64->uint8-array [base64-string]
  (let [padding (.repeat "=" (mod (- 4 (mod (.-length base64-string) 4)) 4))
        base64 (-> (.replace base64-string (js/RegExp. "-" "g") "+")
                   (.replace (js/RegExp. "_" "g") "/")
                   (str padding))
        raw-data (js/atob base64)
        output-array (js/Uint8Array. (.-length raw-data))]
    (dotimes [i (.-length raw-data)]
      (aset output-array i (.charCodeAt raw-data i)))
    output-array))


(defn- clean-url [base path]
  (str (clojure.string/replace base #"/+$" "")
       "/"
       (clojure.string/replace path #"^/+" "")))

(re-frame/reg-event-fx
 :push/enable
 (fn [{:keys [db]} _]
   (let [client (:client db)]
     (if-not (and client (exists? js/window.PushManager) (exists? js/navigator.serviceWorker))
       (do (log/error "Push messaging is not supported.") {})
       (-> (p/let [permission (js/Notification.requestPermission)]
             (if (= permission "granted")
               (p/let [reg (.-ready js/navigator.serviceWorker)
                       existing-sub (.getSubscription (.-pushManager reg))
                       _ (log/warn (js/JSON.stringify existing-sub))
                       sub (if existing-sub
                             existing-sub
                             (.subscribe (.-pushManager reg)
                                         #js {:userVisibleOnly true
                                              :applicationServerKey (url-base64->uint8-array (:vapid-key config))}))]
                 (re-frame/dispatch [:push/register-pusher sub]))
               (log/warn "Notification permission denied.")))
           (p/catch #(log/error "Push setup failed:" %)))))
   {}))




(re-frame/reg-event-fx
 :push/register-pusher
 (fn [{:keys [db]} [_ subscription]]
   (let [client   (:client db)
         hs-url   (.homeserver client)
         token    (try (.-accessToken (.session client))
                       (catch :default _
                         (.. client -session -accessToken)))
         sub-json (.toJSON subscription)
         p256dh   (.. sub-json -keys -p256dh)
         auth     (.. sub-json -keys -auth)
         endpoint (.-endpoint sub-json)
         app-id   (:app-id config)
         push-url (:push-url config)
         payload {:kind "http"
                  :app_id app-id
                  :pushkey p256dh
                  :app_display_name (:app-name config)
                  :device_display_name "Web Browser"
                  :lang (or js/navigator.language "en")
                  :append false
                  :data {:url push-url
                         :events_only true
                         :endpoint endpoint
                         :p256dh p256dh
                         :auth auth}}]
     (cond
       (not token)  (log/error "Missing Access Token!")
       (not app-id) (log/error "Missing app-id! Did you restart Vite after editing .env?")
       (not push-url)(log/error "Missing push-url! Did you restart Vite after editing .env?")
       (not p256dh) (log/error "Missing p256dh key from browser subscription!")
       (not auth)   (log/error "Missing auth key from browser subscription!")
       :else
       (do
         (log/error payload)
         (-> (js/fetch (clean-url hs-url "/_matrix/client/v3/pushers/set")
                     #js {:method "POST"
                          :headers #js {:Authorization (str "Bearer " token)
                                        :Content-Type "application/json"}
                          :body (js/JSON.stringify (clj->js payload))})
           (p/then (fn [resp]
                     (if (.-ok resp)
                       (do
                         (log/info "Pusher registered successfully!")
                         (re-frame/dispatch [:push/set-status :enabled]))
                       (p/let [err-body (.json resp)]
                         (log/error "HS Rejected Pusher:" (js->clj err-body))))))
           (p/catch #(log/error "Network error:" %)))))
     {})))

(re-frame/reg-event-db
 :push/set-status
 (fn [db [_ status]]
   (assoc db :push-status status)))

(re-frame/reg-sub
 :push/status
 (fn [db _]
   (:push-status db :disabled)))

(defn notifications-tab []
  (let [status @(re-frame/subscribe [:push/status])]
    [:div.settings-tab-content
     [:h2.settings-heading "Push Notifications"]
     [:div.settings-section
      [:p.verification-description
       "Enable push notifications to receive alerts for new messages and mentions even when the app is in the background."]
      (if (= status :enabled)
        [:div.success-banner
         [:div.success-icon "✅"]
         [:div.success-text-wrapper
          [:div.success-title "Notifications Active"]
          [:div.success-subtitle "You are receiving push alerts on this device."]]]
        [:button.form-button
         {:on-click #(re-frame/dispatch [:push/enable])}
         "Enable Push Notifications"])]]))

(re-frame/reg-fx
 :idb/fetch-sessions
 (fn [on-success-event]
   (let [req (.open js/indexedDB "sw-vault" 1)]
     (set! (.-onerror req) #(log/error "Failed to open sw-vault"))
     (set! (.-onupgradeneeded req)
           (fn [e]
             (let [db (.. e -target -result)]
               (.createObjectStore db "tokens" #js {:keyPath "userId"}))))
     (set! (.-onsuccess req)
           (fn [e]
             (let [db (.. e -target -result)]
               (if (.contains (.-objectStoreNames db) "tokens")
                 (let [tx          (.transaction db #js ["tokens"] "readonly")
                       store       (.objectStore tx "tokens")
                       get-all-req (.getAll store)]
                   (set! (.-onsuccess get-all-req)
                         (fn [ae]
                           (let [results (js->clj (.. ae -target -result) :keywordize-keys true)]
                             (.close db)
                             (re-frame/dispatch (conj on-success-event results))))))
                 (do
                   (.close db)
                   (re-frame/dispatch (conj on-success-event []))))))))))

(re-frame/reg-event-fx
 :settings/load-accounts
 (fn [{:keys [db]} _]
   {:idb/fetch-sessions [:settings/set-accounts]}))

(re-frame/reg-event-db
 :settings/set-accounts
 (fn [db [_ accounts]]
   (assoc db :available-accounts accounts)))

(re-frame/reg-sub
 :settings/available-accounts
 (fn [db _] (:available-accounts db [])))

(defn account-item [{:keys [acc is-active?]}]
  [:div.account-item {:class (when is-active? "active")}
   [:div.account-info
    [:div.account-id (:userId acc)]
    [:div.account-hs (:hs_url acc)]]

   [:div.account-actions
    (if is-active?
      [:div.active-badge "● Active"]
      [:button.form-button.switch-btn
       {:on-click #(re-frame/dispatch [:auth/switch-account (:userId acc)])}
       "Switch"])]])

(defn accounts-tab []
  (let [accounts @(re-frame/subscribe [:settings/available-accounts])
        current-user @(re-frame/subscribe [:sdk/profile])]
    [:div.settings-tab-content
     [:h2.settings-heading "Managed Accounts"]

     [:div.settings-section
      [:p.verification-description
       "Switch between your active Matrix sessions or add a new one."]

      [:div.accounts-list
       (if (empty? accounts)
         [:div.accounts-empty "No accounts configured."]
         (for [acc accounts]
           ^{:key (:userId acc)}
           [account-item {:acc acc
                          :is-active? (= (:userId acc) (:user-id current-user))}]))]

      [:div.tab-footer
       [:button.form-button
        {:on-click #(re-frame/dispatch [:auth/start-login-flow])}
        "+ Add Account"]]]]))

(defn about-tab []
  (let [version  @(re-frame/subscribe [:app/version])
        app-name (:app-name config "Matrix Client")]
    [:div.settings-tab-content
     [:h2.settings-heading "About"]
     [:div.settings-section
      [:div.about-header
       [:h3 app-name]
       [:div.version-badge (str "v" version)]]
      [:p.verification-description
       "A lightweight, modern Matrix client built with ClojureScript and Re-frame utilizing the Rust-SDK through WASM. Somewhat documented using org-mode."]
      [:div.settings-spacer]
      [:h3.settings-subheading "Updates"]
      [:p.verification-description
       "The app automatically checks for updates in the background, but you can also check manually."]

      [:button.form-button
       {:on-click #(re-frame/dispatch [:app/poll-version true])}
       "Check for Updates"]]]))

(defn settings-modal []
  (let [is-open?   @(re-frame/subscribe [:settings/is-open?])
        active-tab @(re-frame/subscribe [:settings/active-tab])
        profile    @(re-frame/subscribe [:sdk/profile])]
    (when is-open?
      [:div.settings-backdrop
       {:on-click #(re-frame/dispatch [:settings/close])}
       [:div.settings-window
        {:on-click #(.stopPropagation %)}
        [settings-sidebar active-tab]
        [:div.settings-content
         [:div.close-button
          {:on-click #(re-frame/dispatch [:settings/close])}
          [:span "✕"]
          [:span.esc-text "ESC"]]
         (case active-tab
           :my-account    [my-account-tab profile]
           :verification  [verification-tab]
           :accounts      [accounts-tab]
           :notifications [notifications-tab]
           :about         [about-tab]
           [:div {:style {:color "#fff"}} "Tab not found"])]]])))
