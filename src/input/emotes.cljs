(ns input.emotes (:require [promesa.core :as p]
            [re-frame.core :as re-frame]
            [taoensso.timbre :as log]
            [clojure.string :as str]
            [reagent.core :as r]
            [utils.helpers :refer [mxc->url]]
            ["react" :as react]))

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
           _ (log/debug "Fetching packs:" fetch-targets)
           results (p/all
                    (map (fn [[rid pack-name]]
                           (let [clean-hs (str/replace homeserver #"/+$" "")
                                 url (str clean-hs "/_matrix/client/v3/rooms/" rid "/state/im.ponies.room_emotes/" pack-name)]
                             (-> (js/fetch url #js {:headers #js {:Authorization (str "Bearer " token)}})
                                 (.then (fn [resp] (if (.-ok resp) (.json resp) nil)))
                                 (.catch (constantly nil)))))
                         fetch-targets))]
     (re-frame/dispatch [:sdk/save-all-emotes results]))))

(re-frame/reg-event-db
 :sdk/save-all-emotes
 (fn [db [_ packs]]
   (let [all-emotes (->> packs
                         (remove nil?)
                         (map #(js->clj % :keywordize-keys true))
                         (keep :images) 
                         (reduce merge {}))]
     (log/info "Loaded" (count all-emotes) "emotes.")
     (assoc db :emoji/available-packs all-emotes))))


(re-frame/reg-sub
 :emoji/all-packs
 (fn [db _]
   (get db :emoji/available-packs {})))

(defn emoji-sticker-board [{:keys [on-insert-emoji on-send-sticker]}]

  (let [current-cache @(re-frame/subscribe [:emoji/all-packs])]
    (when (empty? current-cache)
      (re-frame/dispatch [:sdk/fetch-all-emotes])))
  (fn [{:keys [on-insert-emoji on-send-sticker]}]
    (let [packs @(re-frame/subscribe [:emoji/all-packs])]
      [:div.emoji-popover
       (if (empty? packs)
         [:div {:style {:padding "20px" :text-align "center" :color "#888"}}
          "Loading global emotes..."]
         [:div.emoji-grid
          (for [[shortcode item] packs]
            ^{:key shortcode}
[:div.emoji-cell
 {:on-click (fn []
              (if (:is-sticker-pack item)
                (on-send-sticker (:url item) shortcode (:info item))
                (on-insert-emoji shortcode)))}
 [:img {:src (mxc->url (:url item))
        :title shortcode
        :loading "lazy"
        :style {:width "48px" :height "48px" :object-fit "contain"}}]])])])))