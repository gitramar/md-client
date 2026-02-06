const { app, BrowserWindow, ipcMain, nativeTheme } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

let mainWindow;
let editorWindow = null;
let filePath = "";
let watcher = null;
let draftContent = null;

const supportedExtensions = new Set([
  ".md",
  ".markdown",
  ".mdown",
  ".mdx",
  ".txt",
  ".js",
  ".ts",
  ".py",
  ".json",
  ".yaml",
  ".yml",
  ".html",
  ".htm"
]);

function resolveFilePath(argv) {
  const candidate = argv.find((arg) => {
    if (!arg) {
      return false;
    }
    const ext = path.extname(arg.toLowerCase());
    return supportedExtensions.has(ext);
  });
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

function renderCodeContent(content, sourcePath) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, "python", "render_markdown.py");
    const args = [scriptPath, "--code", "--stdin"];
    if (sourcePath) {
      args.push("--path", sourcePath);
    }
    const python = spawn("python", args, { windowsHide: true });

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
        reject(new Error(errorOutput || "Code render failed."));
      }
    });

    python.stdin.write(content ?? "", "utf-8");
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
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.hide();
    }
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
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
  editorWindow.webContents.once("did-finish-load", () => {
    editorWindow.webContents.send("editor-init", initialState);
  });

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.hide();
  }
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

ipcMain.handle("render-code-content", async (_event, content, sourcePath) => {
  return renderCodeContent(content ?? "", sourcePath);
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

ipcMain.handle("finish-editing", async () => {
  if (editorWindow && !editorWindow.isDestroyed()) {
    editorWindow.close();
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
  }
  return true;
});
