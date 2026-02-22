(ns client.room-list
  (:require [client.state :refer [sdk-world]]
            ["generated-compat" :as sdk]
            [promesa.core :as p]))

(defn init-room-list-ui! []
  (let [all-rooms (:all-rooms @sdk-world)
        FilterKind (.-RoomListEntriesDynamicFilterKind sdk)]
    (p/let [
            res (.entriesWithDynamicAdapters ^js all-rooms 200
                                             #js {:onUpdate (fn [updates] (handle-room-diff! updates))})
            ctrl (.controller ^js res)
            ldr (.loadingState ^js all-rooms
                               #js {:onUpdate (fn [s] (handle-loading! s ctrl))})]
      (swap! sdk-world assoc :ctrl ctrl)
      (swap! sdk-world assoc-in [:handles :entries] res)
      (swap! sdk-world assoc-in [:handles :loading] ldr)

      (.setFilter ^js ctrl
                  (.All FilterKind #js {:filters #js [(new (.-NonLeft FilterKind))]}))
      (.addOnePage ^js ctrl))))
