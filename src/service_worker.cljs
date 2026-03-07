(ns service-worker
  (:require [clojure.string :as str]
            [promesa.core :as p]
            ["workbox-precaching" :refer [precacheAndRoute]]))

(defonce active-sessions (atom {}))
(defonce session-resolvers (atom []))
(def MAX_CACHE_ITEMS 50)
(def cache-name "matrix-media-v1")
(let [manifest (or js/self.__WB_MANIFEST #js [])]
  (precacheAndRoute manifest))


(.addEventListener js/self "message"
  (fn [event]
    (let [data (.-data event)
          source-id (.. event -source -id)]
      (when (= (.-type data) "SET_SESSION")
        (let [session-data (:session (js->clj data :keywordize-keys true))
              full-session (assoc session-data :client-id source-id)]
          (swap! active-sessions assoc source-id full-session)
          (js/console.log "SW: Session synced for" source-id)
          (doseq [resolve-fn @session-resolvers]
            (resolve-fn true))
          (reset! session-resolvers []))))))

(defn wait-for-session! []
  (if (not-empty @active-sessions)
    (p/resolved true)
    (js/Promise. (fn [resolve _]
                   (swap! session-resolvers conj resolve)))))

(defn prune-cache! [name max-items]
  (p/let [cache (js/caches.open name)
          keys  (.keys cache)]
    (when (> (.-length keys) max-items)
      (p/let [_ (.delete cache (first keys))]
        (prune-cache! name max-items)))))

(js/self.addEventListener "fetch"
  (fn [event]
    (let [request   (.-request event)
          method    (.-method request)
          url       (js/URL. (.-url request))
          path      (.-pathname url)
          auth-path? (str/includes? path "/_matrix/client/v1/media/")
          legacy-path? (or (str/includes? path "/_matrix/media/v3/")
                           (str/includes? path "/_matrix/media/v1/"))]
      (when (= method "GET")
        (cond
          auth-path?
          (.respondWith event
            (p/let [cache  (js/caches.open cache-name)
                    cached (.match cache request)]
              (if cached
                cached
                (p/let [_       (wait-for-session!)
                        session (or (get @active-sessions (.-clientId event))
                                    (first (vals @active-sessions)))
                        token   (:accessToken session)]
                  (if-not token
                    (js/Response.error)
                    (let [headers (js/Headers. (.-headers request))]
                      (.set headers "Authorization" (str "Bearer " token))
                      (p/let [resp (js/fetch (.-url request) #js {:headers headers :mode "cors"})]
                        (when (and (.-ok resp) (< (js/parseInt (.get (.-headers resp) "content-length") 10) 10485760))
                          (.put cache request (.clone resp)))
                        resp)))))))

          legacy-path?
          (.respondWith event
            (p/let [cache  (js/caches.open cache-name)
                    cached (.match cache request)]
              (if cached
                cached
                (p/let [resp (js/fetch request)]
                  (when (and (.-ok resp) (< (js/parseInt (.get (.-headers resp) "content-length") 10) 10485760))
                    (.put cache request (.clone resp)))
                  resp))))
          :else nil)))))

(js/self.addEventListener "install"
  (fn [event]
    (.skipWaiting js/self)))

(js/self.addEventListener "activate"
  (fn [event]
    (.waitUntil event
      (p/all [(.clients.claim js/self)
              (prune-cache! cache-name MAX_CACHE_ITEMS)]))))