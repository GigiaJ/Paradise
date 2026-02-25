(ns client.ui
  (:require [reagent.core :as r]
            [client.timeline :as timeline]
            [taoensso.timbre :as log]
            [clojure.string :as str]
            [client.state :as state :refer [sdk-world]]
            ["@element-hq/web-shared-components" :refer [RoomListView]])
  (:require-macros [utils.macros :refer [ocall oget]]))

(defn login-screen [on-login-trigger]
  (let [fields (r/atom {:hs (or js/process.env.MATRIX_HOMESERVER "")
                        :user ""
                        :pass ""})]
    (fn []
      [:div.login-container.flex.flex-col.items-center.justify-center.h-screen.bg-gray-900
       [:h2.text-white.mb-4 "Paradise Login"]

       [:input.mb-2.p-2.rounded.bg-gray-700.text-white
        {:type "text"
         :placeholder "Homeserver"
         :value (:hs @fields)
         :on-change #(swap! fields assoc :hs (.. % -target -value))}]

       [:input.mb-2.p-2.rounded.bg-gray-700.text-white
        {:type "text"
         :placeholder "Username"
         :on-change #(swap! fields assoc :user (.. % -target -value))}]

       [:input.mb-2.p-2.rounded.bg-gray-700.text-white
        {:type "password"
         :placeholder "Password"
         :on-change #(swap! fields assoc :pass (.. % -target -value))}]

       [:button.p-2.rounded.bg-blue-600.text-white.hover:bg-blue-500
        {:on-click (fn [e]
                     (.preventDefault e)
                     (on-login-trigger (:hs @fields)
                                       (:user @fields)
                                       (:pass @fields)))}
        "Login"]])))


(defn string->color [s]
  (let [hash (reduce (fn [h c] (+ (int c) (bit-shift-left h 5) (- h))) 0 s)
        hue  (mod (Math/abs hash) 360)]
    (str "hsl(" hue ", 60%, 40%)")))


(defn base-avatar-stub
  [{:keys [idName name url size] :or {size "24px"}}]
  (let [initial (if (not-empty name) (str/upper-case (subs name 0 1)) "?")
        bg-color (string->color (or idName name "default"))]
    [:div {:className "avatar-frame"
           :style {:width size :height size :min-width size
                   :border-radius "50%" :background-color bg-color
                   :color "white" :display "flex"
                   :align-items "center" :justify-content "center"
                   :font-size "12px" :overflow "hidden"
                   :pointer-events "none"}}
     (if url
       [:img {:src url :style {:width "100%" :height "100%" :object-fit "cover"}}]
       initial)]))

(defn render-avatar [room-info]
  (r/as-element
   [base-avatar-stub {:idName (.-id room-info)
                      :name   (.-name room-info)
                      :url    (.-avatar room-info)
                      :size   "24px"}]))

(defn element-room-list-view [vm]
  (if vm
    [:> RoomListView {:vm vm
                      :renderAvatar render-avatar}]
    [:div "Room list initializing..."]))

(defn room-view [selected-room]
  [:div.flex-1.flex.flex-col.bg-gray-900
   (if-let [room selected-room]
     [:<>
      [:div.p-4.bg-gray-800.border-b.border-gray-700
       [:h2.text-xl.font-bold (or (.-name ^js room) "Room")]]
      [timeline/timeline-view]]
     [:div.flex-1.flex.items-center.justify-center.text-gray-500
      "Select a room to start chatting"])])