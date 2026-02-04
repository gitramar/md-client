const { app, BrowserWindow, ipcMain, nativeTheme } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

let mainWindow;
let filePath = "";
let watcher = null;

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
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("file-changed");
    }
  });
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
  startWatcher(filePath);
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
  return true;
});

ipcMain.handle("render-markdown-content", async (_event, content) => {
  return renderMarkdownContent(content ?? "");
});
