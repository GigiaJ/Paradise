(ns utils.logger
  (:require [taoensso.timbre :as timbre]
             [taoensso.timbre.appenders.core :as appenders]))

(def json-appender
  {:enabled? true
   :async? false
   :min-level :info
   :fn (fn [{:keys [level ?err msg_ timestamp_ ?ns-str ?file ?line]}]
         (let [entry {:level     (name level)
                      :timestamp (force timestamp_)
                      :ns        ?ns-str
                      :file      ?file
                      :line      ?line
                      :message   (force msg_)
                      :error     (when ?err (str ?err))}]
           (js/console.log (js/JSON.stringify (clj->js entry)))))})

(defn init! []
  (timbre/merge-config!
   {:level :info
    :appenders
    {:console (appenders/console-appender)
     :json    json-appender}})
  (when ^boolean js/goog.DEBUG
    (timbre/merge-config!
     {:appenders {:json {:enabled? false}}})))

(defn log   [level & args] (timbre/log! level :p args))
(defn trace [& args] (timbre/log! :trace :p args))
(defn debug [& args] (timbre/log! :debug :p args))
(defn info  [& args] (timbre/log! :info  :p args))
(defn warn  [& args] (timbre/log! :warn  :p args))
(defn error [& args] (timbre/log! :error :p args))
(defn fatal [& args] (timbre/log! :fatal :p args))