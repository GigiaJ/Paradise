(ns service-worker
  (:require [clojure.string :as str]
            [promesa.core :as p]))

(defonce auth-token (atom nil))

(defonce active-sessions (atom {}))
(defonce session-resolver (atom nil))
(defonce session-promise
  (js/Promise. (fn [resolve]
                 (reset! session-resolver resolve))))

(.addEventListener js/self "message"
  (fn [event]
    (let [data (.-data event)
          source-id (.. event -source -id)]
      (when (= (.-type data) "SET_SESSION")
        (let [session-data (:session (js->clj data :keywordize-keys true))
              full-session (assoc session-data :client-id source-id)]
          (swap! active-sessions assoc source-id full-session)
          (when @session-resolver (@session-resolver full-session))
          (js/console.log "SW: Session updated for client:" source-id))))))

(defn prune-cache! [cache-name max-items]
  (p/let [cache (js/caches.open cache-name)
          keys  (.keys cache)]
    (when (> (.-length keys) max-items)
      (.delete cache (first keys)))))

(def cache-name "matrix-media-v1")


(js/self.addEventListener "fetch"
  (fn [event]
    (let [request   (.-request event)
          method    (.-method request)
          client-id (.-clientId event)
          url       (js/URL. (.-url request))
          path      (.-pathname url)
          is-auth   (str/includes? path "/_matrix/client/v1/media/")]
      (cond
        (and (= method "GET")
             (or is-auth (str/includes? path "/_matrix/media/v3/")))
        (.respondWith event
          (p/let [cache  (js/caches.open cache-name)
                  cached (.match cache request)]
            (if cached
              cached
              (p/let [session (some #(when (= client-id (:client-id %)) %)
                                    (vals @active-sessions))
                      token   (:accessToken session)
                      headers (js/Headers. (.-headers request))]
                (when (and is-auth token)
                  (.set headers "Authorization" (str "Bearer " token)))
                (p/let [resp (js/fetch (.-url request) #js {:headers headers :mode "cors"})]
                  (when (and (.-ok resp)
                             (< (js/parseInt (.get (.-headers resp) "content-length") 10) 10485760))
                    (.put cache request (.clone resp)))
                  resp)))))
        :else nil))))

(js/self.addEventListener "install"
  (fn [event]
    (.skipWaiting js/self)))

(js/self.addEventListener "activate"
  (fn [event]
    (.waitUntil event (.clients.claim js/self))))