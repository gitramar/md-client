const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("mdClient", {
  getFilePath: () => ipcRenderer.invoke("get-file-path"),
  renderMarkdown: (mdPath) => ipcRenderer.invoke("render-markdown", mdPath),
  readMarkdown: (mdPath) => ipcRenderer.invoke("read-markdown", mdPath),
  saveMarkdown: (mdPath, content) =>
    ipcRenderer.invoke("save-markdown", mdPath, content),
  renderMarkdownContent: (content) =>
    ipcRenderer.invoke("render-markdown-content", content),
  onFileChanged: (callback) => {
    ipcRenderer.on("file-changed", () => {
      callback();
    });
  }
});
