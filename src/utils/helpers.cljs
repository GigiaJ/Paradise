(ns utils.helpers
  (:require
   [clojure.string :as str]
   [hickory.core :as h]
   [hickory.render :as hr]
   [clojure.walk :as walk]
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

(def max-tag-nesting 100)

(def permitted-tags
  #{:font :del :h1 :h2 :h3 :h4 :h5 :h6 :blockquote :p :a :ul :ol :sup :sub
    :li :b :i :u :strong :em :strike :s :code :hr :br :div :table :thead
    :tbody :tr :th :td :caption :pre :span :img :details :summary})

(def url-schemes #{"https" "http" "ftp" "mailto" "magnet"})

(def permitted-attrs
  {:font #{:style :data-mx-bg-color :data-mx-color :color}
   :span #{:style :data-mx-bg-color :data-mx-color :data-mx-spoiler :data-mx-maths :data-mx-pill :data-mx-ping :data-md}
   :div  #{:data-mx-maths}
   :blockquote #{:data-md}
   :h1 #{:data-md} :h2 #{:data-md} :h3 #{:data-md} :h4 #{:data-md} :h5 #{:data-md} :h6 #{:data-md}
   :pre  #{:data-md :class}
   :ol   #{:start :type :data-md}
   :ul   #{:data-md}
   :a    #{:name :target :href :rel :data-md}
   :img  #{:width :height :alt :title :src :data-mx-emoticon}
   :code #{:class :data-md}
   :strong #{:data-md} :i #{:data-md} :em #{:data-md} :u #{:data-md} :s #{:data-md} :del #{:data-md}})

(def non-text-tags #{:style :script :textarea :option :noscript :mx-reply})

(defn- transform-font-span [attrs]
  (let [bg (get attrs :data-mx-bg-color)
        fg (get attrs :data-mx-color)
        style-parts (cond-> []
                      bg (conj (str "background-color: " bg))
                      fg (conj (str "color: " fg)))]
    (if (seq style-parts)
      (assoc attrs :style (str/join "; " style-parts))
      attrs)))

(defn- transform-a [attrs]
  (assoc attrs :rel "noopener" :target "_blank"))

(defn- transform-img [attrs]
  (let [src (get attrs :src "")]
    (if (and (string? src) (str/starts-with? src "mxc://"))
      {:tag :img
       :attrs (assoc attrs :src (mxc->url src {:type   :thumbnail
                                               :width  (or (get attrs :width) 32)
                                               :height (or (get attrs :height) 32)
                                               :method "scale"}))}
      {:tag :a
       :attrs {:href src :rel "noopener" :target "_blank"}
       :content [(or (get attrs :alt) src)]})))

(defn- filter-code-classes [attrs]
  (if-let [cls (:class attrs)]
    (let [classes (str/split cls #"\s+")
          valid (filter #(str/starts-with? % "language-") classes)]
      (if (seq valid)
        (assoc attrs :class (str/join " " valid))
        (dissoc attrs :class)))
    attrs))

(defn- valid-url? [href]
  (if (string? href)
    (let [scheme (-> href (str/split #":" 2) first str/lower-case)]
      (contains? url-schemes scheme))
    false))

(defn sanitize-nodes [nodes depth]
  (if (> depth max-tag-nesting)
    []
    (mapcat
     (fn [node]
       (cond
         (string? node)
         [node]

         (and (map? node) (= (:type node) :element))
         (let [{:keys [tag attrs content]} node]
           (cond
             (contains? non-text-tags tag)
             []

             (contains? permitted-tags tag)
             (let [allowed-keys (get permitted-attrs tag #{})
                   clean-attrs (select-keys attrs allowed-keys)
                   [final-tag final-attrs transformed-content]
                   (case tag
                     (:font :span) [tag (transform-font-span clean-attrs) nil]
                     :a            [tag (transform-a clean-attrs) nil]
                     :code         [tag (filter-code-classes clean-attrs) nil]
                     :img          (let [{t :tag a :attrs c :content} (transform-img clean-attrs)]
                                     [t a c])
                     [tag clean-attrs nil])
                   final-attrs (if (and (= final-tag :a)
                                        (not (valid-url? (:href final-attrs))))
                                 (dissoc final-attrs :href)
                                 final-attrs)
                   children (or transformed-content
                                (sanitize-nodes content (inc depth)))]
               [(if (seq final-attrs)
                  (into [final-tag final-attrs] children)
                  (into [final-tag] children))])

             :else
             (sanitize-nodes content depth)))

         :else []))
     nodes)))

(defn sanitize-custom-html [raw-html]
  (when raw-html
    (let [html-str (str raw-html)
          raw-fragments (h/parse-fragment html-str)
          hickory-maps  (map h/as-hickory raw-fragments)]
      (sanitize-nodes hickory-maps 0))))

(defn sanitize-text [raw-text]
  (when raw-text
    (str/escape (str raw-text) {\& "&amp;" \< "&lt;" \> "&gt;" \" "&quot;" \' "&#39;"})))