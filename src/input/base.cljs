(ns input.base
  (:require [promesa.core :as p]
            [re-frame.core :as re-frame]
            [taoensso.timbre :as log]
            [clojure.string :as str]
            [input.drafts :refer [attachment-preview]]
            [input.composer :refer [tiptap-component]]
            [reagent.core :as r]
            ["generated-compat" :as sdk :refer [messagetype messageformat mediasource uploadsource uploadparameters]]))

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


(re-frame/reg-event-fx
 :composer/submit
 (fn [{:keys [db]} [_ room-id text html attachments]]
   (let [client   (:client db)
         timeline (get-in db [:timeline-subs room-id :timeline])
         room     (when client (.getRoom client room-id))]
     (cond
       (or (not timeline) (not room))
       (do (log/error "Room or Timeline missing for" room-id) {})
       (seq attachments)
       (try
         (doseq [[idx att] (map-indexed vector attachments)]
           (let [mime (or (:mime att) "application/octet-stream")
                 file-info #js {:mimetype mime
                                :size (js/BigInt (.-byteLength (:buffer att)))
                                :thumbnailInfo js/undefined
                                :thumbnailSource js/undefined}
                 upload-source (.new (.-Data (.-UploadSource sdk))
                                     #js {:bytes (:buffer att) :filename (:filename att)})
                 caption (if (and (= idx 0) (not (str/blank? text))) text (:filename att))
                 formatted (if (and (= idx 0) (not (str/blank? html))) html js/undefined)
                 params (.. (.-UploadParameters sdk)
                            (create #js {:source upload-source
                                         :caption caption
                                         :formattedCaption formatted}))]
             (log/info "Sending file" (inc idx) "of" (count attachments))
             (.sendFile timeline params file-info)))
         (.clearComposerDraft room js/undefined)
         (doseq [att attachments] (js/URL.revokeObjectURL (:preview-url att)))
         {:db (-> db
                  (assoc-in [:drafts room-id :attachments] [])
                  (assoc-in [:composer room-id] {:text "" :html ""}))}
         (catch :default e
           (log/error "File Send Panic:" e)
           {}))
       :else
       (try
         (let [msg-type (.new (.-Text MessageType) #js {:content #js {:body text :formatted js/undefined}})
               event    (.createMessageContent timeline msg-type)]
           (.send timeline event)
           (.clearComposerDraft room js/undefined)
           {:db (assoc-in db [:composer room-id] {:text "" :html ""})})
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
  (let [active-id @(re-frame/subscribe [:rooms/active-id])
        uploading? @(re-frame/subscribe [:input/uploading?])
        attachments @(re-frame/subscribe [:composer/attachments active-id])
        loaded-text @(re-frame/subscribe [:composer/loaded-text active-id])]
    [:div.timeline-input-outer
     [:div.timeline-input-wrapper
      (when (seq attachments)
        [:div.composer-attachments {:style {:display "flex"
                                            :flex-direction "row"
                                            :overflow-x "auto"
                                            :gap "10px"
                                            :padding "10px"
                                            :background "rgba(0,0,0,0.2)"}}
         (doall
          (map-indexed (fn [idx att]
                         ^{:key (str "att-" idx)}
                         [attachment-preview active-id att idx])
                       attachments))])

      (when uploading?
        [:div.upload-indicator
         [:span.upload-text "Uploading file..."]
         [:div.upload-progress-bar [:div.upload-progress-fill]]])

      [:> tiptap-component
       #js {:activeId active-id
            :loadedText loaded-text
            :onChange (fn [text html]
                        (re-frame/dispatch [:composer/on-change active-id text html]))
            :onSend (fn [text html]
                      (re-frame/dispatch [:composer/submit active-id text html attachments]))
            :onFiles (fn [files]
                       (let [file-array (js/Array.from files)]
                         (re-frame/dispatch [:sdk/handle-file-drop active-id file-array])))}]]]))
