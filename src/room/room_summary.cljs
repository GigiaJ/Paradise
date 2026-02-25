(ns room.room-summary
  (:require [promesa.core :as p]
            [clojure.string :as str]
            [taoensso.timbre :as log]
            ;; We need to add RoomListItemViewModel
            )
  (:require-macros [utils.macros :refer [ocall oget]]))

(defn mxc->url [mxc-url]
  (when mxc-url
    (str (clojure.string/replace mxc-url #"^mxc://"
                               (str (or js/process.env.MATRIX_HOMESERVER "https://matrix.org")
                                 "/_matrix/media/v3/thumbnail/"))
         "?width=48&height=48")
         ))

(defn build-room-summary [room room-info latest-event]
  (let [
        num-notifications (js/Number (oget room-info :numUnreadNotifications))
        num-mentions      (js/Number (oget room-info :numUnreadMentions))
        num-unread        (js/Number (oget room-info :numUnreadMessages))
        membership        (oget room-info :membership)
        invited           (= membership "Invited") ;; Check against your FFI Membership enum
        is-marked-unread  (oget room-info :isMarkedUnread)
        ;; Notification State Logic
        notification-state
        #js {:isMention                    (> num-mentions 0)
             :isNotification               (or (> num-notifications 0) is-marked-unread)
             :isActivityNotification       (and (> num-unread 0) (<= num-notifications 0))
             :hasAnyNotificationOrActivity (or (> num-unread 0) (> num-notifications 0) invited is-marked-unread)
             :invited                      invited}
        display-name (or (some-> (oget room-info :displayName) clojure.string/trim)
                         (oget room-info :id))
        avatar-url   (mxc->url (oget room-info :avatarUrl))]
    #js {:room                       room
         :id                         (oget room-info :id)
         :name                       display-name
         :avatar                     avatar-url
         ;; TODO Add message preview handling here
         :messagePreview             nil
         :showNotificationDecoration (oget notification-state :hasAnyNotificationOrActivity)
         :notificationState          notification-state
         :hasParticipantInCall       (boolean (oget room-info :hasRoomCall))
         :isBold                     (oget notification-state :hasAnyNotificationOrActivity)
         :unreadMessagesCount        num-unread
         :unreadMentionsCount        num-mentions
         :unreadNotificationsCount   num-notifications
         :membership                 membership
         :isDirect                   (oget room-info :isDirect)
         :isSpace                    (oget room-info :isSpace)
         :isFavourite                (oget room-info :isFavourite)
         :isMarkedUnread             is-marked-unread}))