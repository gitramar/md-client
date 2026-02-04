const { app, BrowserWindow, ipcMain, nativeTheme } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

let mainWindow;
let editorWindow = null;
let filePath = "";
let watcher = null;
let draftContent = null;

function resolveFilePath(argv) {
  const candidate = argv.find((arg) => arg && arg.endsWith(".md"));
  return candidate ? path.resolve(candidate) : "";
}

function renderMarkdown(mdPath) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, "python", "render_markdown.py");
    const python = spawn("python", [scriptPath, mdPath], {
      windowsHide: true
    });

    let output = "";
    let errorOutput = "";

    python.stdout.on("data", (data) => {
      output += data.toString();
    });

    python.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    python.on("close", (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(errorOutput || "Markdown render failed."));
      }
    });
  });
}

function renderMarkdownContent(content) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, "python", "render_markdown.py");
    const python = spawn("python", [scriptPath, "--stdin"], {
      windowsHide: true
    });

    let output = "";
    let errorOutput = "";

    python.stdout.on("data", (data) => {
      output += data.toString();
    });

    python.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    python.on("close", (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(errorOutput || "Markdown render failed."));
      }
    });

    python.stdin.write(content, "utf-8");
    python.stdin.end();
  });
}

function startWatcher(mdPath) {
  if (!mdPath || !fs.existsSync(mdPath)) {
    return;
  }
  if (watcher) {
    watcher.close();
  }
  watcher = fs.watch(mdPath, { persistent: false }, () => {
    broadcastToWindows("file-changed");
  });
}

function findCursorOffset(content, sourceText) {
  if (!sourceText) {
    return null;
  }
  const needle = sourceText.replace(/\s+/g, " ").trim().toLowerCase();
  if (!needle) {
    return null;
  }

  const haystack = content.toLowerCase();
  const directMatch = haystack.indexOf(needle);
  if (directMatch >= 0) {
    return directMatch;
  }

  const words = needle
    .split(" ")
    .map((word) => word.trim())
    .filter((word) => word.length > 3);
  for (const word of words) {
    const match = haystack.indexOf(word);
    if (match >= 0) {
      return match;
    }
  }

  return null;
}

function broadcastToWindows(channel, ...args) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args);
  }
  if (editorWindow && !editorWindow.isDestroyed()) {
    editorWindow.webContents.send(channel, ...args);
  }
}

function createWindow() {
  nativeTheme.themeSource = "dark";

  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    backgroundColor: "#0b0f14",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  startWatcher(filePath);
}

function createEditorWindow(initialState) {
  if (editorWindow && !editorWindow.isDestroyed()) {
    editorWindow.focus();
    editorWindow.webContents.send("editor-sync", initialState);
    return;
  }

  editorWindow = new BrowserWindow({
    width: 1200,
    height: 760,
    minWidth: 900,
    minHeight: 640,
    backgroundColor: "#0b0f14",
    parent: mainWindow || undefined,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  editorWindow.loadFile(path.join(__dirname, "renderer", "editor.html"));
  editorWindow.on("closed", () => {
    editorWindow = null;
  });
  editorWindow.webContents.once("did-finish-load", () => {
    editorWindow.webContents.send("editor-init", initialState);
  });
}

app.on("ready", () => {
  filePath = resolveFilePath(process.argv);
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("get-file-path", () => filePath);

ipcMain.handle("render-markdown", async (_event, mdPath) => {
  if (!mdPath) {
    return "";
  }
  if (!fs.existsSync(mdPath)) {
    throw new Error("File not found.");
  }
  return renderMarkdown(mdPath);
});

ipcMain.handle("read-markdown", async (_event, mdPath) => {
  if (!mdPath) {
    return "";
  }
  if (!fs.existsSync(mdPath)) {
    throw new Error("File not found.");
  }
  return fs.promises.readFile(mdPath, "utf-8");
});

ipcMain.handle("save-markdown", async (_event, mdPath, content) => {
  if (!mdPath) {
    throw new Error("No file path set.");
  }
  await fs.promises.writeFile(mdPath, content, "utf-8");
  draftContent = null;
  return true;
});

ipcMain.handle("render-markdown-content", async (_event, content) => {
  return renderMarkdownContent(content ?? "");
});

ipcMain.handle("open-editor", async (_event, options) => {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error("File not found.");
  }
  const baseContent =
    draftContent === null
      ? await fs.promises.readFile(filePath, "utf-8")
      : draftContent;
  const cursorOffset = findCursorOffset(baseContent, options?.sourceText);
  createEditorWindow({
    filePath,
    content: baseContent,
    cursorOffset,
    focusEditor: true
  });
  if (editorWindow && !editorWindow.isDestroyed()) {
    editorWindow.focus();
  }
  return true;
});

ipcMain.on("markdown-draft-updated", (_event, mdPath, content) => {
  if (mdPath !== filePath) {
    return;
  }
  draftContent = content;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("markdown-updated", content);
  }
});
