
(ns overlays.lightbox
  (:require [promesa.core :as p]
            [re-frame.core :as re-frame]
            [taoensso.timbre :as log]
            [clojure.string :as str]
            [re-frame.db :as db]
            [reagent.core :as r]
            [reagent.dom.client :as rdom]
                      ))


(re-frame/reg-event-db
 :ui/open-image-preview
 (fn [db [_ url]]
   (assoc db :image-preview-url url)))

(re-frame/reg-event-db
 :ui/close-image-preview
 (fn [db _]
   (dissoc db :image-preview-url)))

(re-frame/reg-sub
 :ui/image-preview-url
 (fn [db _]
   (:image-preview-url db)))


(defn image-lightbox []
  (r/with-let [!state           (r/atom {:scale 1 :last-scale 1 :x 0 :y 0 :last-x 0 :last-y 0 :start-dist 0})
               !active-pointers (atom {})
               close-fn         #(re-frame/dispatch [:ui/close-image-preview])
               reset-zoom-fn    #(reset! !state {:scale 1 :last-scale 1 :x 0 :y 0 :last-x 0 :last-y 0 :start-dist 0})
               get-dist (fn [p1 p2]
                          (let [dx (- (.-clientX p1) (.-clientX p2))
                                dy (- (.-clientY p1) (.-clientY p2))]
                            (js/Math.sqrt (+ (* dx dx) (* dy dy)))))
               handle-keyup (fn [e] (when (= (.-key e) "Escape") (close-fn)))
               _ (.addEventListener js/window "keyup" handle-keyup)]
    (let [url @(re-frame/subscribe [:ui/image-preview-url])
          {:keys [scale x y]} @!state
          active-count (count @!active-pointers)]

      (when url
        [:div.lightbox-backdrop
         {:on-click close-fn
          :on-wheel (fn [e]
                      (let [zoom-factor (if (pos? (.-deltaY e)) 0.9 1.1)
                            new-scale   (max 1 (min 5 (* scale zoom-factor)))]
                        (if (<= new-scale 1)
                          (reset-zoom-fn)
                          (swap! !state assoc :scale new-scale :last-scale new-scale))))
          :on-pointer-down (fn [e]
                             (swap! !active-pointers assoc (.-pointerId e) e)
                             (let [ps (vals @!active-pointers)]
                               (cond
                                 (= (count ps) 2)
                                 (swap! !state assoc :start-dist (get-dist (first ps) (second ps))
                                                     :last-scale scale)
                                 (= (count ps) 1)
                                 (swap! !state assoc :last-x (.-clientX e)
                                                     :last-y (.-clientY e)))))
          :on-pointer-move (fn [e]
                             (when (contains? @!active-pointers (.-pointerId e))
                               (swap! !active-pointers assoc (.-pointerId e) e)
                               (let [ps (vals @!active-pointers)]
                                 (cond
                                   (= (count ps) 2)
                                   (let [new-dist (get-dist (first ps) (second ps))
                                         {:keys [start-dist last-scale]} @!state
                                         new-scale (max 1 (min 5 (* last-scale (/ new-dist start-dist))))]
                                     (swap! !state assoc :scale new-scale))
                                   (and (= (count ps) 1) (> scale 1))
                                   (let [dx (- (.-clientX e) (:last-x @!state))
                                         dy (- (.-clientY e) (:last-y @!state))]
                                     (swap! !state assoc :x (+ x dx) :y (+ y dy)
                                                         :last-x (.-clientX e)
                                                         :last-y (.-clientY e)))))))
          :on-pointer-up (fn [e]
                           (swap! !active-pointers dissoc (.-pointerId e))
                           (let [ps (vals @!active-pointers)
                                 curr-scale (:scale @!state)]
                             (cond
                               (<= curr-scale 1)
                               (reset-zoom-fn)
                               (= (count ps) 1)
                               (let [p (first ps)]
                                 (swap! !state assoc :last-scale curr-scale
                                                     :last-x (.-clientX p)
                                                     :last-y (.-clientY p)))
                               (zero? (count ps))
                               (swap! !state assoc :last-scale curr-scale))))
          :on-pointer-cancel (fn [_] (reset! !active-pointers {}))}

         [:div.lightbox-close-btn {:on-click close-fn} "✖"]

         [:div.lightbox-container
          {:on-click #(.stopPropagation %)}
          [:img.lightbox-image
           {:src url
            :on-double-click (fn [e] (.stopPropagation e) (reset-zoom-fn))
            :style {:transform (str "translate(" x "px, " y "px) scale(" scale ")")
                    :transition (if (pos? active-count) "none" "transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)")
                    :cursor (if (> scale 1) (if (pos? active-count) "grabbing" "grab") "zoom-in")
                    :touch-action "none"
                    :user-select "none"
                    :pointer-events "auto"}}]
          [:div.lightbox-actions
           [:a.lightbox-btn {:href url :target "_blank" :rel "noopener noreferrer"}
            [:span.btn-icon "↗️"] [:span "Open Original"]]
           [:a.lightbox-btn {:href url :download "image"}
            [:span.btn-icon "⬇️"] [:span "Download"]]]]]))
    (finally
      (.removeEventListener js/window "keyup" handle-keyup))))