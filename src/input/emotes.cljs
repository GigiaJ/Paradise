(ns input.emotes
  (:require
   [promesa.core :as p]
   [re-frame.core :as re-frame]
   [taoensso.timbre :as log]
   [clojure.string :as str]
   [reagent.core :as r]
   [utils.helpers :refer [mxc->url fetch-state-event fetch-room-state]]
   [utils.global-ui :refer [click-away-wrapper]]
   ["react" :as react]
   ))

(defn shape-emote-packs [room-id events]
  (->> events
       (filter #(= (:type %) "im.ponies.room_emotes"))
       (map (fn [e] {:pack-id (or (not-empty (:state_key e)) room-id)
                     :data (:content e)}))))

(defn unwrap-rooms [raw-json]
  (let [data (js->clj (js/JSON.parse raw-json) :keywordize-keys true)
        rooms-map (:rooms data)]
    (for [[rid packs] rooms-map
          [pack-name _] packs]
      [(name rid) (name pack-name)])))

(defn fetch-emote-packs [homeserver token [rid pack-name]]
  (-> (fetch-state-event homeserver token rid "im.ponies.room_emotes" pack-name)
      (p/then (fn [json]
                (when json
                  {:pack-id pack-name :data json})))
      (p/catch (fn [err] (log/error "Failed to fetch pack" pack-name err) nil))))

(re-frame/reg-fx
 :principle-fetch-emotes
 (fn [{:keys [token homeserver client]}]
   (p/let [raw-json (.accountData client "im.ponies.emote_rooms")
           fetch-targets (unwrap-rooms raw-json)
           results (p/all (map #(fetch-emote-packs homeserver token %) fetch-targets))]
     (re-frame/dispatch [:sdk/save-all-emotes :account nil (remove nil? results)]))))

(re-frame/reg-fx
 :principle-fetch-room-emotes-fx
 (fn [{:keys [token homeserver source-type room-id]}]
   (-> (fetch-room-state homeserver token room-id nil nil
                         (partial shape-emote-packs room-id))
       (p/then (fn [packs]
                 (when (seq packs)
                   (re-frame/dispatch [:sdk/save-all-emotes source-type room-id packs]))))
       (p/catch #(log/error "Room fetch failed" room-id %)))))

(re-frame/reg-event-fx
 :sdk/fetch-all-emotes
 (fn [{:keys [db]} _]
   (let [client (:client db)
         session (some-> client (.session))]
     (if (and client session)
       {:principle-fetch-emotes {:token (.-accessToken session)
                                 :homeserver (.-homeserverUrl session)
                                 :client client}}
       {}))))

(re-frame/reg-event-fx
 :sdk/fetch-room-emotes
 (fn [{:keys [db]} [_ source-type room-id]]
   (let [client (:client db)
         session (some-> client (.session))]
     (if (and session room-id)
       {:principle-fetch-room-emotes-fx {:token (.-accessToken session)
                                         :homeserver (.-homeserverUrl session)
                                         :source-type source-type
                                         :room-id room-id}}
       {}))))

(re-frame/reg-event-db
 :sdk/save-all-emotes
 (fn [db [_ source-type source-id fetched-packs]]
   (let [structured-packs (into {}
                                (for [{:keys [pack-id data]} (remove nil? fetched-packs)
                                      :let [clj-data    (if (map? data) data (js->clj data :keywordize-keys true))
                                            images      (:images clj-data)
                                            pack-info   (:pack clj-data)
                                            usage-set   (set (:usage pack-info []))
                                            is-sticker? (contains? usage-set "sticker")]
                                      :when (seq images)]
                                  [pack-id {:name             (or (:display_name pack-info) pack-id)
                                            :avatar           (:avatar_url pack-info)
                                            :is-sticker-pack? is-sticker?
                                            :images           images}]))]
     (if (= source-type :account)
       (assoc-in db [:emoji/packs :account] structured-packs)
       (assoc-in db [:emoji/packs source-type source-id] structured-packs)))))

(re-frame/reg-sub
 :emoji/active-set
 (fn [db _]
   (let [active-space (:active-space-id db)
         active-room (:active-room-id db)
         account-packs (get-in db [:emoji/packs :account] {})
         space-packs (when active-space (get-in db [:emoji/packs :space active-space] {}))
         room-packs (when active-room (get-in db [:emoji/packs :room active-room] {}))]
     (merge account-packs space-packs room-packs))))

(defn emoji-sticker-board [{:keys [on-close on-insert-emoji on-send-sticker]}]
  (re-frame/dispatch [:sdk/fetch-all-emotes])
  (let [selected-pack-id (r/atom nil)
        sticker-mode?    (r/atom false)]
    (fn [{:keys [on-close on-insert-emoji on-send-sticker]}]
      (let [packs       @(re-frame/subscribe [:emoji/active-set])
            active-id   (or @selected-pack-id (first (keys packs)))
            active-pack (get packs active-id)]
        [click-away-wrapper
         {:on-close on-close :z-index 998}
         [:div.emoji-popover
          (if (empty? packs)
            [:div.emoji-loading "No emotes found for this space."]
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
                               (if (or @sticker-mode? (:is-sticker-pack? active-pack))
                                 (on-send-sticker (:url item) shortcode (:info item))
                                 (on-insert-emoji shortcode (:url item))))}
                  [:img.emoji-img
                   {:src      (mxc->url (:url item))
                    :title    shortcode
                    :loading  "lazy"
                    :alt      shortcode}]])]]])]]))))