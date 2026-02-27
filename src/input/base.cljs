(ns input.base
  (:require [promesa.core :as p]
            [re-frame.core :as re-frame]
            [taoensso.timbre :as log]
            [clojure.string :as str]
            [input.drafts :refer [attachment-preview reify-attachment]]
            [input.composer :refer [tiptap-component]]
            [input.emotes :refer [emoji-sticker-board]]
            [reagent.core :as r]
            ["generated-compat" :as sdk :refer [MessageType MessageFormat MediaSource UploadSource UploadParameters]]))

(re-frame/reg-event-fx
 :sdk/upload-media
 (fn [{:keys [db]} [_ file on-success-event]]
   (let [client (:client db)
         reader (js/FileReader.)]
     (if (and client file)
       (do
         (set! (.-onload reader)
               (fn [e]
                 (let [buffer (.. e -target -result)
                       mime (.-type file)]
                   (-> (.uploadMedia client mime buffer js/undefined)
                       (p/then (fn [mxc-url]
                                 (re-frame/dispatch (conj on-success-event mxc-url))))
                       (p/catch #(log/error "Generic Upload Failed:" %))))))
         (.readAsArrayBuffer reader file)
         {:db (assoc db :uploading-files? true)})
       (do (js/console.warn "Missing client or file for generic upload") {})))))

(re-frame/reg-event-fx
 :sdk/upload-and-send-file
 (fn [{:keys [db]} [_ room-id buffer mime filename]]
   (let [timeline (get-in db [:timeline-subs room-id :timeline])]
     (if-not timeline
       (log/error "No timeline found for" room-id)
       (try
         (let [file-info #js {:mimetype        (or mime "application/octet-stream")
                              :size            (js/BigInt (.-byteLength buffer))
                              :thumbnailInfo   js/undefined
                              :thumbnailSource js/undefined}

               upload-source (.new (.. UploadSource -Data)
                                   #js {:bytes    buffer
                                        :filename filename})
               params (.. UploadParameters
                          (create #js {:source  upload-source
                                       :caption filename}))]
           (.sendFile timeline params file-info)
           (re-frame/dispatch [:sdk/upload-complete]))
         (catch :default e
           (js/console.error "FFI Sync Call Panic:" e)
           (re-frame/dispatch [:sdk/upload-complete]))))
     {})))


(re-frame/reg-event-fx
 :sdk/handle-file-drop
 (fn [{:keys [db]} [_ room-id files]]
   (let [raw-file (first files)]
     (if raw-file
       (let [reader (js/FileReader.)
             preview-url (js/URL.createObjectURL raw-file)
             mime (.-type raw-file)
             filename (.-name raw-file)]
         (set! (.-onload reader)
               (fn [e]
                 (let [buffer (.. e -target -result)
                       attachment {:buffer buffer
                                   :mime mime
                                   :filename filename
                                   :preview-url preview-url}]
                   (re-frame/dispatch [:composer/add-attachment room-id attachment]))))
         (.readAsArrayBuffer reader raw-file)
         {:db db})
       (do (log/warn "Missing file for drop") {})))))

(defn build-mentions [user-ids push-room?]
  (if (and (empty? user-ids) (not push-room?))
    js/undefined
    (.. (.-Mentions sdk)
        (create #js {:userIds (clj->js user-ids)
                     :room (boolean push-room?)}))))

(defn send-all! [timeline attachments text html]
  (let [total (count attachments)
        send-one (fn send-one [remaining-atts idx]
                   (if (empty? remaining-atts)
                     (js/Promise.resolve true)
                     (let [att (first remaining-atts)
                           is-last? (= idx (dec total))
                           caption   (if is-last? text (:filename att))
                           formatted (if (and is-last? (not (str/blank? html)))
                                       #js {:format (.new (.-Html (.-MessageFormat sdk)))
                                            :body html}
                                       js/undefined)

                           ffi-att (reify-attachment att)
                           inner   (.-inner ffi-att)
                           info    (condp = (.-tag ffi-att)
                                     "Image" (.-imageInfo inner)
                                     "Video" (.-videoInfo inner)
                                     (.-fileInfo inner))
                           params (.. (.-UploadParameters sdk)
                                      (create #js {:source (.-source inner)
                                                   :caption (or caption js/undefined)
                                                   :formattedCaption (or formatted js/undefined)}))]
                       (log/info "Sending file" (inc idx) "of" total)
                       (-> (.sendFile timeline params info)
                           (.then (fn [] (send-one (rest remaining-atts) (inc idx))))))))]
    (send-one (vec attachments) 0)))

(re-frame/reg-event-fx
 :composer/submit
 (fn [{:keys [db]} [_ room-id text html _]]
   (let [client   (:client db)
         timeline (get-in db [:timeline-subs room-id :timeline])
         room     (when client (.getRoom client room-id))
         attachments (get-in db [:drafts room-id :attachments])]
     (cond
       (or (not timeline) (not room))
       (do (log/error "Room or Timeline missing for" room-id) {})
       (seq attachments)
       (let [total (count attachments)]
         (p/let [_ (p/loop [idx 0]
                     (when (< idx total)
                       (let [att       (nth attachments idx)
                             is-last?  (= idx (dec total))
                             ffi-att   (reify-attachment att)
                             inner     (.-inner ffi-att)
                             tag       (.-tag ffi-att)
                             caption   (if is-last? (or text js/undefined) (:filename att))
                             formatted (if (and is-last? (not (str/blank? html)))
                                         #js {:format (.new (.-Html (.-MessageFormat sdk)))
                                              :body html}
                                         js/undefined)
                             params (.. (.-UploadParameters sdk)
                                        (create #js {:source (.-source inner)
                                                     :caption (or caption js/undefined)
                                                     :formattedCaption (or formatted js/undefined)}))
                             info   (condp = tag
                                      "Image" (.-imageInfo inner)
                                      "Video" (.-videoInfo inner)
                                      (.-fileInfo inner))]
                         (log/info "Sending" tag (inc idx) "of" total)
                         (.sendFile timeline params info)
                         (p/do! (p/delay 100)
                                (p/recur (inc idx))))))]
           (.clearComposerDraft room js/undefined)
           (doseq [att attachments] (js/URL.revokeObjectURL (:preview-url att)))
           (re-frame/dispatch [:composer/clear-after-submit room-id]))
         {})
       :else
       (try
         (let [msg-type (.new (.-Text MessageType) #js {:content #js {:body text :formatted js/undefined}})
               event    (.createMessageContent timeline msg-type)]
           (.send timeline event)
           (.clearComposerDraft room js/undefined)
           {:db (assoc-in db [:composer room-id] {:text "" :html "" :loaded-text ""})})
         (catch :default e (log/error "Send Text Panic:" e) {}))))))


(re-frame/reg-event-fx
 :sdk/send-message
 (fn [{:keys [db]} [_ room-id text html]]
   (let [timeline (get-in db [:timeline-subs room-id :timeline])]
     (if-not timeline
       (js/console.error "Cannot send: Timeline not booted for" room-id)
       (try
         (let [text-payload #js {:content #js {:body text
                                               :formatted js/undefined}}
               msg-type     (.new (.-Text MessageType) text-payload)
               event        (.createMessageContent timeline msg-type)]
           (-> (.send timeline event)
               (.then #(js/console.log "Message sent!"))
               (.catch #(js/console.error "Failed to send message:" %))))
         (catch :default e
           (js/console.error "FFI Constructor panic:" e)))))
   {}))

(re-frame/reg-event-db
 :sdk/upload-complete
 (fn [db _]
   (assoc db :uploading-files? false)))

(re-frame/reg-sub
 :input/uploading?
 (fn [db _]
   (:uploading-files? db false)))

(defn message-input []
  (r/with-let [!picker-open? (r/atom false)]
    (fn []
      (let [active-id   @(re-frame/subscribe [:rooms/active-id])
            uploading?  @(re-frame/subscribe [:input/uploading?])
            attachments @(re-frame/subscribe [:composer/attachments active-id])
            loaded-text @(re-frame/subscribe [:composer/loaded-text active-id])]
        [:div.timeline-input-outer {:style {:position "relative"}}
         (when @!picker-open?
           [:div.picker-popover {:style {:position "absolute"
                                         :bottom "100%"
                                         :right "0"
                                         :z-index 100
                                         :margin-bottom "10px"
                                         :background "var(--bg-color, #fff)"
                                         :border "1px solid #ccc"
                                         :border-radius "8px"
                                         :box-shadow "0 4px 12px rgba(0,0,0,0.15)"
                                         :padding "10px"
                                         :width "300px"
                                         :max-height "400px"
                                         :overflow-y "auto"}}
            [emoji-sticker-board
             {:on-send-sticker
              (fn [mxc alt-text info]
                (re-frame/dispatch [:sdk/send-sticker active-id mxc alt-text info])
                (reset! !picker-open? false))
              :on-insert-emoji
              (fn [shortcode mxc]
                ;; TODO: We need to tell Tiptap to insert this
                (js/console.log "Need to insert into Tiptap:" shortcode mxc)
                (reset! !picker-open? false))}]])

         [:div.timeline-input-wrapper {:style {:display "flex" :align-items "flex-end" :gap "10px"}}
          (when (seq attachments)
            [:div.composer-attachments {:style {:display "flex" :flex-direction "row" :overflow-x "auto"
                                                :gap "10px" :padding "10px" :background "rgba(0,0,0,0.2)"}}
             (doall
              (map-indexed (fn [idx att]
                             ^{:key (str "att-" idx)}
                             [attachment-preview active-id att idx])
                           attachments))])

          (when uploading?
            [:div.upload-indicator
             [:span.upload-text "Uploading file..."]
             [:div.upload-progress-bar [:div.upload-progress-fill]]])

          [:div {:style {:flex-grow 1}}
           [:> tiptap-component
            #js {:activeId active-id
                 :loadedText loaded-text
                 :onChange (fn [text html]
                             (re-frame/dispatch [:composer/on-change active-id text html]))
                 :onSend (fn [text html]
                           (re-frame/dispatch [:composer/submit active-id text html attachments]))
                 :onFiles (fn [files]
                            (let [file-array (js/Array.from files)]
                              (re-frame/dispatch [:sdk/handle-file-drop active-id file-array])))}]]
          [:button.emoji-toggle-btn
           {:on-click #(swap! !picker-open? not)
            :style {:padding "10px"
                    :background "transparent"
                    :border "none"
                    :cursor "pointer"
                    :font-size "1.2rem"}}
           "😀"]]]))))
