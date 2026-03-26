(ns container.pins
  (:require
   [re-frame.core :as re-frame]
   [taoensso.timbre :as log]
   [promesa.core :as p]
   [clojure.string :as str]
   ["react-virtuoso" :refer [Virtuoso GroupedVirtuoso]]
   [reagent.core :as r]
   [reagent.dom.client :as rdom]
   [utils.helpers :refer [mxc->url fetch-state-event fetch-room-state]]
   [utils.svg :as icons]
   [container.reusable :refer [make-timeline-item-shim message-preview-item]]
   [container.timeline.base :refer [apply-timeline-diffs!]]
   [container.timeline.item :refer [event-tile wrap-item]]
   [utils.global-ui :refer [avatar]]
   ["ffi-bindings" :as sdk :refer [RoomMessageEventContentWithoutRelation MessageType EditedContent TimelineConfiguration]]
   )
  )

(defn fetch-pin-via-ephemeral-timeline [room event-id]
  (js/Promise.
   (fn [resolve _]
     (p/let [focus    (.new (.. sdk -TimelineFocus -Event) #js {:eventId event-id :numEventsToLoad 1})
             config   (.create sdk/TimelineConfiguration
                               #js {:focus             focus
                                    :dateDividerMode   (.-Daily sdk/DateDividerMode)
                                    :filter            (new (.. sdk -TimelineFilter -All))
                                    :trackReadReceipts false})
             timeline (.timelineWithConfiguration room config)]
       (let [handle-ref (atom nil)
             resolved?  (atom false)
             cleanup!   (fn []
                          (when-let [h @handle-ref]
                            (try (.cancel h) (catch :default _)))
                          (reset! handle-ref nil))]

         (reset! handle-ref
                 (.addListener timeline
                   #js {:onUpdate
                        (fn [_diffs]
                          (when-not @resolved?
                            (reset! resolved? true)
                            (-> (.getEventTimelineItemByEventId timeline event-id)
                                (p/then (fn [item]
                                          (cleanup!)
                                          (if item
                                            (resolve (wrap-item
                                                       (make-timeline-item-shim item event-id)))

                                            (resolve nil))))
                                (p/catch (fn [err]
                                           (cleanup!)
                                           (log/error "Shim wrapping failed:" err)
                                           (resolve nil))))))}))

         (js/setTimeout (fn []
                          (when-not @resolved?
                            (reset! resolved? true)
                            (cleanup!)
                            (resolve nil)))
                        5000))))))


(re-frame/reg-fx
 :fetch-room-pins
 (fn [{:keys [room room-id homeserver token]}]
   (p/let [pinned-data (fetch-room-state homeserver token room-id "m.room.pinned_events" "" identity)
           pinned-ids  (get pinned-data :pinned [])
           resolved-events
           (p/all
            (for [eid pinned-ids]
              (-> (fetch-pin-via-ephemeral-timeline room eid)
                  (p/catch (fn [err]
                             (log/error "Pin resolve failed for" eid err)
                             nil)))))]
     (re-frame/dispatch [:room/save-pinned-events room-id (remove nil? resolved-events)]))))


(re-frame/reg-event-fx
 :room/fetch-pinned-events
 (fn [{:keys [db]} [_ room-id]]
   (let [client   (:client db)
         session  (some-> client (.session))
         room     (some-> client (.getRoom room-id))]
     (if (and client session room)
       {:fetch-room-pins {:token      (.-accessToken session)
                          :homeserver (.-homeserverUrl session)
                          :room-id    room-id
                          :room       room}}
       (log/error "Cannot fetch pins: Missing client, session, or room for:" room-id)))))

(re-frame/reg-event-db
 :room/save-pinned-events
 (fn [db [_ room-id pinned-events]]
   (assoc-in db [:rooms/data room-id :pinned-events] pinned-events)))


(re-frame/reg-sub
 :room/pinned-events
 (fn [db [_ room-id]]
   (get-in db [:rooms/data room-id :pinned-events] [])))

(re-frame/reg-sub
 :room/pinned-ids
 (fn [db [_ room-id]]
   (let [events (get-in db [:rooms/data room-id :pinned-events] [])]
     (mapv :id events))))

(re-frame/reg-sub
 :room/pinned-event-by-id
 (fn [db [_ room-id event-id]]
   (let [pins (get-in db [:rooms/data room-id :pinned-events] [])]
     (first (filter #(= (:id %) event-id) pins)))))


(defn pins []
  (let [active-room @(re-frame/subscribe [:rooms/active-id])
        pins        @(re-frame/subscribe [:room/pinned-events active-room])
        tr          @(re-frame/subscribe [:i18n/tr])]
    [:div.sidebar-pins-container
     {:style {:display "flex" :flex-direction "column" :height "100%" :padding "16px"}}
     (if (empty? pins)
       [:div.empty-pins
        {:style {:text-align "center" :margin-top "40px" :opacity 0.5}}
        [icons/pins {:width "48px" :height "48px"}]
        [:p (tr [:container.pins/no-pins] "No pinned messages")]]
       [:div.pins-list
        {:style {:flex 1 :overflow-y "auto"}}
        (for [event pins]
          [message-preview-item active-room event])])]))

