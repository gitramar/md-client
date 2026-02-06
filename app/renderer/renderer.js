const filePathEl = document.getElementById("file-path");
const renderedEl = document.getElementById("rendered");
const emptyStateEl = document.getElementById("empty-state");
const hintEl = document.getElementById("hint");
const editButtonEl = document.getElementById("edit-button");

let filePath = "";
let currentContent = "";
let fileType = "markdown";

const markdownExtensions = new Set([".md", ".markdown", ".mdown", ".mdx"]);
const textExtensions = new Set([".txt"]);
const codeExtensions = new Set([
  ".js",
  ".ts",
  ".py",
  ".json",
  ".yaml",
  ".yml"
]);
const htmlExtensions = new Set([".html", ".htm"]);

function getExtension(value) {
  if (!value) {
    return "";
  }
  const match = value.toLowerCase().match(/\.([^.\\/]+)$/);
  return match ? `.${match[1]}` : "";
}

function getFileType(value) {
  const ext = getExtension(value);
  if (markdownExtensions.has(ext)) {
    return "markdown";
  }
  if (htmlExtensions.has(ext)) {
    return "html";
  }
  if (textExtensions.has(ext)) {
    return "text";
  }
  if (codeExtensions.has(ext)) {
    return "code";
  }
  return "text";
}

function toFileUrl(fsPath) {
  if (!fsPath) {
    return "";
  }
  const normalized = fsPath.replace(/\\/g, "/");
  if (normalized.startsWith("/")) {
    return `file://${normalized}`;
  }
  return `file:///${normalized}`;
}

function toParentDirFileUrl(fsPath) {
  if (!fsPath) {
    return "";
  }
  const lastSlash = Math.max(fsPath.lastIndexOf("\\"), fsPath.lastIndexOf("/"));
  if (lastSlash < 0) {
    return "";
  }
  return toFileUrl(fsPath.slice(0, lastSlash + 1));
}

function isRelativeAssetPath(value) {
  if (!value) {
    return false;
  }
  return !/^(?:[a-zA-Z][a-zA-Z\d+\-.]*:|\/\/|#)/.test(value);
}

function resolveRenderedAssetUrls(container, mdPath) {
  const base = toParentDirFileUrl(mdPath);
  if (!base) {
    return;
  }

  for (const img of container.querySelectorAll("img[src]")) {
    const src = img.getAttribute("src");
    if (isRelativeAssetPath(src)) {
      img.src = new URL(src, base).toString();
    }
  }

  for (const link of container.querySelectorAll("a[href]")) {
    const href = link.getAttribute("href");
    if (isRelativeAssetPath(href)) {
      link.href = new URL(href, base).toString();
    }
  }
}

function nearestSourceText(target) {
  if (!(target instanceof Element)) {
    return "";
  }
  const container = target.closest(
    "h1, h2, h3, h4, h5, h6, p, li, blockquote, td, th, code, pre"
  );
  const text = (container ? container.textContent : target.textContent) || "";
  return text.replace(/\s+/g, " ").trim().slice(0, 140);
}

function renderPreformatted(content, kind) {
  const pre = document.createElement("pre");
  pre.className = `preformatted ${kind}`;
  const code = document.createElement("code");
  code.textContent = content ?? "";
  pre.appendChild(code);
  renderedEl.replaceChildren(pre);
}

async function renderPreview(content) {
  try {
    if (fileType === "markdown") {
      const html = await window.mdClient.renderMarkdownContent(content);
      renderedEl.className = "markdown panel rendered-panel";
      renderedEl.innerHTML = html;
      resolveRenderedAssetUrls(renderedEl, filePath);
      return;
    }

    if (fileType === "html") {
      renderedEl.className = "panel rendered-panel";
      renderedEl.innerHTML = content ?? "";
      resolveRenderedAssetUrls(renderedEl, filePath);
      return;
    }

    if (fileType === "code") {
      const html = await window.mdClient.renderCodeContent(content, filePath);
      renderedEl.className = "panel rendered-panel";
      renderedEl.innerHTML = html;
      resolveRenderedAssetUrls(renderedEl, filePath);
      return;
    }

    renderedEl.className = "panel rendered-panel";
    renderPreformatted(content, fileType);
  } catch (error) {
    renderedEl.className = "panel rendered-panel";
    renderedEl.innerHTML = `<pre class="error">${error.message}</pre>`;
  }
}

async function loadMarkdown() {
  filePath = await window.mdClient.getFilePath();
  if (!filePath) {
    renderedEl.innerHTML = "";
    emptyStateEl.style.display = "flex";
    filePathEl.textContent = "No file loaded";
    editButtonEl.disabled = true;
    return;
  }

  filePathEl.textContent = filePath;
  emptyStateEl.style.display = "none";
  editButtonEl.disabled = false;
  fileType = getFileType(filePath);
  hintEl.style.display = fileType === "markdown" ? "block" : "none";

  try {
    currentContent = await window.mdClient.readMarkdown(filePath);
    await renderPreview(currentContent);
  } catch (error) {
    renderedEl.innerHTML = `<pre class="error">${error.message}</pre>`;
  }
}

editButtonEl.addEventListener("click", async () => {
  if (!filePath) {
    return;
  }
  await window.mdClient.openEditor({});
});

renderedEl.addEventListener("click", async (event) => {
  if (!filePath) {
    return;
  }
  if (fileType !== "markdown") {
    return;
  }
  if (!(event.ctrlKey || event.metaKey)) {
    return;
  }
  event.preventDefault();
  const sourceText = nearestSourceText(event.target);
  await window.mdClient.openEditor({ sourceText });
});

window.mdClient.onMarkdownUpdated((content) => {
  currentContent = content;
  renderPreview(content);
});

window.mdClient.onFileChanged(() => {
  loadMarkdown();
});

loadMarkdown();
