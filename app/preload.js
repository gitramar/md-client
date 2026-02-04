const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("mdClient", {
  getFilePath: () => ipcRenderer.invoke("get-file-path"),
  renderMarkdown: (mdPath) => ipcRenderer.invoke("render-markdown", mdPath),
  readMarkdown: (mdPath) => ipcRenderer.invoke("read-markdown", mdPath),
  saveMarkdown: (mdPath, content) =>
    ipcRenderer.invoke("save-markdown", mdPath, content),
  renderMarkdownContent: (content) =>
    ipcRenderer.invoke("render-markdown-content", content),
  openEditor: (options) => ipcRenderer.invoke("open-editor", options ?? {}),
  notifyDraftUpdated: (mdPath, content) =>
    ipcRenderer.send("markdown-draft-updated", mdPath, content),
  onFileChanged: (callback) => {
    ipcRenderer.on("file-changed", () => {
      callback();
    });
  },
  onMarkdownUpdated: (callback) => {
    ipcRenderer.on("markdown-updated", (_event, content) => {
      callback(content);
    });
  },
  onEditorInit: (callback) => {
    ipcRenderer.on("editor-init", (_event, state) => {
      callback(state);
    });
  },
  onEditorSync: (callback) => {
    ipcRenderer.on("editor-sync", (_event, state) => {
      callback(state);
    });
  }
});
