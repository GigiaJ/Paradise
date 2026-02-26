(ns utils.helpers
  (:require
   [clojure.string :as str]
   ))

(defn mxc->url
  "Converts an mxc:// URI to a full HTTP(S) URL.
   Options:
   - :type   :download (default) or :thumbnail
   - :width  integer
   - :height integer
   - :method 'crop' or 'scale'"
  ([mxc-url] (mxc->url mxc-url {}))
  ([mxc-url {:keys [type width height method] :or {type :download}}]
   (when (and mxc-url (str/starts-with? mxc-url "mxc://"))
     (let [server-base (or js/process.env.MATRIX_HOMESERVER
                           (or js/window.MATRIX_HOMESERVER "https://matrix.org"))
           resource    (str/replace mxc-url #"^mxc://" "")
           base-path   (str "/_matrix/client/v1/media/" (name type) "/" resource)]
       (if (= type :thumbnail)
         (str server-base base-path
              "?width="  (or width 48)
              "&height=" (or height 48)
              "&method=" (or method "crop"))
         (str server-base base-path))))))