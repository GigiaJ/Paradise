(ns timeline.base
  (:require [promesa.core :as p]
            [re-frame.core :as re-frame]
            [taoensso.timbre :as log]
            [re-frame.db :as db]
            ["react-virtuoso" :refer [Virtuoso]]
            [promesa.core :as p]
            [reagent.core :as r]
            [reagent.dom.client :as rdom]
            [input.base :refer [message-input]]
            [room.room-summary :refer [build-room-summary]]
            [client.diff-handler :refer [apply-matrix-diffs]]))

(defn apply-timeline-diffs! [room-id updates]
  (let [current-events (get-in @re-frame.db/app-db [:timeline room-id] [])]
    (-> (apply-matrix-diffs current-events updates identity)
        (.then (fn [next-events]
                 (re-frame/dispatch [:sdk/update-timeline room-id next-events])))
        (.catch #(js/console.error "Timeline Diff Panic:" %)))))

(re-frame/reg-event-db
 :sdk/update-timeline
 (fn [db [_ room-id events]]
   (assoc-in db [:timeline room-id] events)))

(re-frame/reg-event-fx
 :sdk/cleanup-timeline
 (fn [{:keys [db]} [_ room-id]]
   (when-let [subs (get-in db [:timeline-subs room-id])]
     (when-let [tl-handle (:tl-handle subs)]
       (.cancel tl-handle))
     (when-let [pag-handle (:pag-handle subs)]
       (.cancel pag-handle)))
   {:db (update db :timeline-subs dissoc room-id)}))

(re-frame/reg-event-db
 :sdk/update-pagination-status
 (fn [db [_ room-id status]]
   (assoc-in db [:timeline-pagination room-id] status)))


(re-frame/reg-event-fx
 :sdk/boot-timeline
 (fn [{:keys [db]} [_ room-id]]
   (let [client (:client db)]
     (when-let [room (.getRoom client room-id)]
       (-> (p/let [timeline (.timeline room)
                   listener #js {:onUpdate
                                 (fn [diffs]
                                   (apply-timeline-diffs! room-id diffs))}
                   timeline-handle (.addListener timeline listener)
                   pag-listener #js {:onUpdate
                                     (fn [status]
                                       (re-frame/dispatch [:sdk/update-pagination-status room-id status]))}
                   pag-handle (.subscribeToBackPaginationStatus timeline pag-listener)]
             (re-frame/dispatch [:sdk/save-timeline-sub room-id timeline timeline-handle pag-handle])
             (.paginateBackwards timeline 50))
           (.catch (fn [err]
                     (js/console.error err))))))
   {}))

(re-frame/reg-event-db
 :sdk/save-timeline-sub
 (fn [db [_ room-id timeline tl-handle pag-handle]]
   (assoc-in db [:timeline-subs room-id]
             {:timeline timeline
              :tl-handle tl-handle
              :pag-handle pag-handle})))


(re-frame/reg-sub
 :timeline/current-events
 (fn [db _]
   (let [active-room (:active-room-id db)]
     (get-in db [:timeline active-room] []))))

(re-frame/reg-event-fx
 :sdk/back-paginate
 (fn [{:keys [db]} [_ room-id]]
   (when-let [timeline (get-in db [:timeline-subs room-id :timeline])]
     (.paginateBackwards timeline 20))
   {}))


(defn event-tile [item]
  (let [event-obj (.asEvent item)]
    (if-not event-obj
      [:div.virtual-item
       {:style {:text-align "center" :color "#6c7086" :font-size "0.8em" :margin "8px 0"}}
       "--- Timeline Separator ---"]
      (let [;; Safe drilling for display name, fallback to raw sender ID
            sender (or (.. event-obj -senderProfile -inner -displayName)
                       (.-sender event-obj))

            content-enum  (.-content event-obj)
            content-tag   (when content-enum (.-tag content-enum))
            content-inner (when content-enum (.-inner content-enum))]
        (cond
          (= content-tag "MsgLike")
          (let [msg-content    (.-content content-inner)
                msg-kind-tag   (some-> msg-content .-kind .-tag)
                msg-kind-inner (some-> msg-content .-kind .-inner)]
            (cond
              (= msg-kind-tag "Redacted")
              [:div.message [:span.sender sender] " deleted a message."]

              (= msg-kind-tag "UnableToDecrypt")
              [:div.message [:span.sender sender] " UTD (Unable to decrypt)"]

              (= msg-kind-tag "Message")
              (let [actual-content (.-content msg-kind-inner)
                    msg-type-enum  (.-msgType actual-content)
                    msg-type-tag   (.-tag msg-type-enum)
                    msg-type-inner (.-inner msg-type-enum)
                    body           (if (= msg-type-tag "Text")
                                     (.. msg-type-inner -content -body)
                                     (str "Sent a " msg-type-tag))]
                [:div.message 
                 [:span.sender {:style {:font-weight "bold" :margin-right "8px"}} sender] 
                 [:span.body body]])

              :else
              [:div.message "Unknown message kind"]))

          (= content-tag "RoomMembership")
          [:div.state-event 
           {:style {:color "#89b4fa" :font-size "0.85em" :margin "4px 0"}}
           (str sender " membership changed")]

          (= content-tag "ProfileChange")
          [:div.state-event 
           {:style {:color "#89b4fa" :font-size "0.85em" :margin "4px 0"}}
           (str sender " changed their profile")]

          :else
          [:div.message 
           [:span.sender sender] 
           [:span.body (str " Unknown event type: " content-tag)]])))))


(defn virtualized-timeline [events room-id]
  (let [event-array (to-array events)]
    [:> Virtuoso
     {:style {:height "100%" :width "100%"}
      :data event-array
      :alignToBottom true
      :followOutput true
      :startReached #(re-frame/dispatch [:sdk/back-paginate room-id])
      :computeItemKey (fn [index item]
                        (let [id (try (.uniqueIdentifier item) (catch :default _ nil))]
                          (if id id index)))
      :itemContent (fn [index item]
                     (r/as-element
                      (let [id (try (.uniqueIdentifier item) (catch :default _ nil))]
                        [:li.timeline-item
                         {:key id :style {:list-style "none" :margin-bottom "4px"}}
                         [event-tile item]])))}]))


(defn timeline []
  (let [active-id @(re-frame/subscribe [:rooms/active-id])
        room-meta @(re-frame/subscribe [:rooms/active-metadata])
        events @(re-frame/subscribe [:timeline/current-events])]
    [:div.timeline-container
     {:style {:display "flex" :flex-direction "column" :height "100%" :flex 1}}
     (if-not active-id
       [:div.timeline-empty "Select a room to start chatting."]
       (let [display-name (or (.-name room-meta) active-id)]
         [:<>
          [:div.timeline-header
           {:style {:flex-shrink 0 :padding "16px" :border-bottom "1px solid #313244"}}
           [:h2.timeline-header-title display-name]]
          [:div.timeline-messages
           {:style {:flex 1 :min-height 0}}
           [virtualized-timeline events active-id]]
          [message-input]]))]))
