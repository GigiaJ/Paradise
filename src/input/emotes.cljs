(ns input.emotes
  (:require
   [promesa.core :as p]
   [re-frame.core :as re-frame]
   [taoensso.timbre :as log]
   [clojure.string :as str]
   [reagent.core :as r]
   [utils.helpers :refer [mxc->url]]
   [utils.global-ui :refer [click-away-wrapper]]
   ["react" :as react]
   ))

(re-frame/reg-event-fx
 :sdk/fetch-all-emotes
 (fn [{:keys [db]} _]
   (if (empty? (:emoji/available-packs db))
     (let [client (:client db)
           session (when client (.session client))]
       (if (and client session)
         {:principle-fetch-emotes {:token (.-accessToken session)
                                   :homeserver (.-homeserverUrl session)
                                   :client client}}
         (do (log/warn "No active session to fetch emotes.") {})))
     {})))

(re-frame/reg-fx
 :principle-fetch-emotes
 (fn [{:keys [token homeserver client]}]
   (p/let [raw-json (.accountData client "im.ponies.emote_rooms")
           data (js->clj (js/JSON.parse raw-json) :keywordize-keys true)
           rooms-map (:rooms data)
           fetch-targets (for [[rid packs] rooms-map
                               [pack-name _] packs]
                           [(name rid) (name pack-name)])
           results (p/all
                    (map (fn [[rid pack-name]]
                           (let [clean-hs (str/replace homeserver #"/+$" "")
                                 url (str clean-hs "/_matrix/client/v3/rooms/" rid "/state/im.ponies.room_emotes/" pack-name)]
                             (-> (p/let [resp (js/fetch url #js {:headers #js {:Authorization (str "Bearer " token)}})]
                                   (when (.-ok resp)
                                     (p/let [json (.json resp)]
                                       {:pack-id pack-name :data json})))
                                 (p/catch (constantly nil)))))
                         fetch-targets))]
     (re-frame/dispatch [:sdk/save-all-emotes results]))))


#_(re-frame/reg-event-db
 :sdk/save-all-emotes
 (fn [db [_ fetched-packs]]
   (let [valid-packs (remove nil? fetched-packs)
         structured-packs (into {}
                                (for [{:keys [pack-id data]} valid-packs
                                      :let [clj-data (js->clj data :keywordize-keys true)
                                            pack-info (:pack clj-data)]]
                                  [pack-id {:name   (or (:display_name pack-info) pack-id)
                                            :avatar (:avatar_url pack-info)
                                            :images (:images clj-data)}]))]
     (log/info "Loaded" (count structured-packs) "packs!")
     (assoc db :emoji/available-packs structured-packs))))

(re-frame/reg-event-db
 :sdk/save-all-emotes
 (fn [db [_ fetched-packs]]
   (let [valid-packs (remove nil? fetched-packs)
         structured-packs (into {}
                                (for [{:keys [pack-id data]} valid-packs
                                      :let [clj-data    (js->clj data :keywordize-keys true)
                                            pack-info   (:pack clj-data)
                                            usage-set   (set (:usage pack-info []))
                                            is-sticker? (contains? usage-set "sticker")]]
                                  [pack-id {:name             (or (:display_name pack-info) pack-id)
                                            :avatar           (:avatar_url pack-info)
                                            :is-sticker-pack? is-sticker? 
                                            :images           (:images clj-data)}]))]
     (log/info "Loaded" (count structured-packs) "packs!")
     (assoc db :emoji/available-packs structured-packs))))

(re-frame/reg-sub
 :emoji/all-packs
 (fn [db _]
   (get db :emoji/available-packs {})))



(defn emoji-sticker-board [{:keys [on-close on-insert-emoji on-send-sticker]}]
  (re-frame/dispatch [:sdk/fetch-all-emotes])
  (let [selected-pack-id (r/atom nil)
        sticker-mode?    (r/atom false)]
    (fn [{:keys [on-close on-insert-emoji on-send-sticker]}]
      (let [packs @(re-frame/subscribe [:emoji/all-packs])
            active-id   (or @selected-pack-id (first (keys packs)))
            active-pack (get packs active-id)]
        [click-away-wrapper
         {:on-close on-close
          :z-index 998}
         [:div.emoji-popover
          (if (empty? packs)
            [:div.emoji-loading "Loading emotes..."]
            [:div.emoji-container
             [:div.emoji-sidebar
              (for [[pack-id pack-data] packs]
                (let [pname  (or (:name pack-data) (str pack-id))
                      avatar (:avatar pack-data)]
                  [:div.sidebar-pack-item
                   {:key      pack-id
                    :class    (when (= active-id pack-id) "active")
                    :on-click #(reset! selected-pack-id pack-id)
                    :title    pname}
                   (if avatar
                     [:img.pack-icon {:src (mxc->url avatar)}]
                     [:span.pack-text-icon (subs pname 0 (min 2 (count pname)))])]))]
             [:div.emoji-grid-area
              [:div.emoji-pack-header
               [:div.emoji-pack-title (or (:name active-pack) "Emotes")]
               [:div.emoji-mode-switch
                [:button {:class    (when-not @sticker-mode? "active")
                          :on-click #(reset! sticker-mode? false)} "Inline"]
                [:button {:class    (when @sticker-mode? "active")
                          :on-click #(reset! sticker-mode? true)} "Sticker"]]]
              [:div.emoji-grid
               (for [[shortcode item] (get active-pack :images {})]
                 [:div.emoji-cell
                  {:key      shortcode
                   :on-click (fn []
                               (if @sticker-mode?
                                 (on-send-sticker (:url item) shortcode (:info item))
                                 (on-insert-emoji shortcode (:url item))))}
                  [:img.emoji-img
                   {:src      (mxc->url (:url item))
                    :title    shortcode
                    :loading  "lazy"
                    :alt      shortcode}]])]]])]]))))


  #_(defn emoji-sticker-board [{:keys [on-close on-insert-emoji on-send-sticker]}]
  (re-frame/dispatch [:sdk/fetch-all-emotes])
  (let [selected-pack-id (r/atom nil)]
    (fn [{:keys [on-close on-insert-emoji on-send-sticker]}]
      (let [packs @(re-frame/subscribe [:emoji/all-packs])
            active-id  (or @selected-pack-id (first (keys packs)))
            active-pack (get packs active-id)]
        [click-away-wrapper
         {:on-close on-close
          :z-index 998}
         [:div.emoji-popover
          (if (empty? packs)
            [:div.emoji-loading "Loading emotes..."]
            [:div.emoji-container
             [:div.emoji-sidebar
              (for [[pack-id pack-data] packs]
                (let [pname (or (:name pack-data) (str pack-id))
                      avatar (:avatar pack-data)]
                  [:div.sidebar-pack-item
                   {:key      pack-id
                    :class    (when (= active-id pack-id) "active")
                    :on-click #(reset! selected-pack-id pack-id)
                    :title    pname}
                   (if avatar
                     [:img.pack-icon {:src (mxc->url avatar)}]
                     [:span.pack-text-icon (subs pname 0 (min 2 (count pname)))])]))]
             [:div.emoji-grid-area
              [:div.emoji-pack-title (or (:name active-pack) "Emotes")]
              [:div.emoji-grid
               (for [[shortcode item] (get active-pack :images {})]
                 [:div.emoji-cell
                  {:key      shortcode
                   :on-click (fn []
                              ;; Check the pack, not the individual image item
                              (if (:is-sticker-pack? active-pack)
                                (on-send-sticker (:url item) shortcode (:info item))
                                (on-insert-emoji shortcode (:url item))))}
                  [:img.emoji-img
                   {:src     (mxc->url (:url item))
                    :title   shortcode
                    :loading "lazy"
                    :alt     shortcode}]])]]])]]))))