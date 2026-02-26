(ns service-worker
  (:require [clojure.string :as str]
            [promesa.core :as p]))

(defonce auth-token (atom nil))

(defonce auth-token (atom nil))

;; This holds the 'resolve' function for our promise
(defonce token-resolver (atom nil))

;; This is the promise itself that fetch will wait on
(defonce token-promise
  (js/Promise. (fn [resolve]
                 (reset! token-resolver resolve))))

(.addEventListener js/self "message"
  (fn [event]
    (let [data (.-data event)]
      (when (= (.-type data) "SET_TOKEN")
        (when @token-resolver (@token-resolver (.-token data)))
        (js/console.log "SW: Token updated")))))

(def cache-name "matrix-media-v1")

(js/self.addEventListener "fetch"
  (fn [event]
    (let [request (.-request event)
          url     (js/URL. (.-url request))
          path    (.-pathname url)]
      (cond
        (or (str/includes? path "/_matrix/client/v1/media/")
            (str/includes? path "/_matrix/media/v3/"))

        (.respondWith event
          (p/let [cache    (js/caches.open cache-name)
                  cached   (.match cache (.-url request))]
            (if cached
              cached
              (p/let
                  [token (if @auth-token
                @auth-token
                (p/race [token-promise (p/delay 2000 nil)]))
        _ (js/console.log "SW: Proceeding with token:" (some? token))
        headers (js/Headers. (.-headers request))
        _ (when token (.set headers "Authorization" (str "Bearer " token)))
        resp (js/fetch (.-url request) #js {:headers headers :mode "cors"})]
                (when (.-ok resp)
                  (.put cache (.-url request) (.clone resp)))
                resp))))

        :else nil))))

(js/self.addEventListener "install"
  (fn [event]
    (.skipWaiting js/self)))

(js/self.addEventListener "activate"
  (fn [event]
    (.waitUntil event (.clients.claim js/self))))