(ns input.composer
    (:require [promesa.core :as p]
            [re-frame.core :as re-frame]
            [taoensso.timbre :as log]
            [clojure.string :as str]
            [reagent.core :as r]
            ["react" :as react]
            ["@tiptap/react" :refer [useEditor EditorContent]]
            ["@tiptap/starter-kit" :default StarterKit]
            ["@tiptap/extension-placeholder" :default Placeholder]
            ["@tiptap/core" :refer [Extension]]
            ["prosemirror-state" :refer [Plugin PluginKey]]
            ["generated-compat" :as sdk :refer [MessageType MessageFormat MediaSource UploadSource UploadParameters]]))

(def file-drop-extension
  (.create Extension
    #js {:name "fileDropHandler"
         :addOptions (fn [] #js {:onFiles nil})
         :addProseMirrorPlugins
         (fn []
           (this-as this
             #js [(new Plugin
                       #js {:key (new PluginKey "fileDropHandler")
                            :props #js {:handleDOMEvents
                                        #js {:drop (fn [view event]
                                                     (let [dt (.-dataTransfer event)
                                                           files (when dt (.-files dt))]
                                                       (if (and files (pos? (.-length files)))
                                                         (do
                                                           (.preventDefault event)
                                                           (when-let [on-files (.. this -options -onFiles)]
                                                             (on-files files))
                                                           true)
                                                         false)))
                                             :paste (fn [view event]
                                                      (let [cd (.-clipboardData event)
                                                            files (when cd (.-files cd))]
                                                        (if (and files (pos? (.-length files)))
                                                          (do
                                                            (.preventDefault event)
                                                            (when-let [on-files (.. this -options -onFiles)]
                                                              (on-files files))
                                                            true)
                                                          false)))}}})]))}))

(def submit-extension
  (.create Extension
    #js {:name "submitExtension"
         :addOptions (fn [] #js {:onSend nil})
         :addKeyboardShortcuts
         (fn []
           (this-as this
             #js {"Enter" (fn [context]
                            (let [editor (.-editor context)
                                  text (.getText editor)
                                  html (.getHTML editor)
                                  on-send (.. this -options -onSend)]
                              (when (and on-send (not (str/blank? text)))
                                (on-send text html)
                                (.commands.clearContent editor true))
                              true))
                  "Shift-Enter" (fn [] false)}))}))

(defn tiptap-component [^js props]
  (let [active-id    (.. props -children -activeId)
        on-send      (.. props -children -onSend)
        on-files     (.. props -children -onFiles)
        on-change    (.. props -children -onChange)
        loaded-text  (.. props -children -loadedText)
        editor (useEditor
                #js {:extensions #js [(.configure StarterKit #js {})
                                      (.configure Placeholder #js {:placeholder "Type a message..."})
                                      (.configure submit-extension #js {:onSend on-send})
                                      (.configure file-drop-extension #js {:onFiles on-files})]
                     :content (or loaded-text "")
                     :editable (boolean active-id)
                     :onUpdate (fn [ctx]
                                 (when on-change
                                   (on-change (.getText (.-editor ctx))
                                              (.getHTML (.-editor ctx)))))
                     :editorProps #js {:attributes #js {:class "tiptap-editor-surface"}}}
                #js [active-id (boolean loaded-text)])]
    (if-not editor
      (react/createElement "div" #js {:className "timeline-input-wrapper"}
                           (react/createElement "div" #js {:className "tiptap-editor-surface"}))
      (react/createElement "div"
                           #js {:key (str "editor-" active-id "-" (when (seq loaded-text) "ready"))
                                :className "timeline-input-wrapper"
                                :onClick (fn [] (.commands.focus editor))}
                           (react/createElement EditorContent #js {:editor editor})))))