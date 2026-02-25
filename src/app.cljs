(ns app
  (:require
   [re-frame.core :as re-frame]
   [taoensso.timbre :as log]
   [promesa.core :as p]
   [reagent.core :as r]
   [reagent.dom.client :as rdom]
   [spaces.bar :refer [spaces-sidebar]]
   [timeline.base :refer [timeline]]
   [room.room-list :refer [room-list]]
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
   :active-room-id  nil})

(re-frame/reg-event-db
 :initialize-db
 (fn [_ _]
   default-db))

(defn main-layout []
  [:div.app-root
   [spaces-sidebar]
   [room-list]
   [timeline]
   ])

(defonce root (atom nil))

(defn mount-root []
  (re-frame/clear-subscription-cache!)
  (let [container (.getElementById js/document "root")]
    (when-not @root
      (reset! root (rdom/create-root container)))
    (.render @root (r/as-element [main-layout]))))

(defn ^:export init []
  (re-frame/dispatch-sync [:initialize-db])
  (mount-root))

(defn ^:after-load re-render []
  (mount-root))