const filePathEl = document.getElementById("file-path");
const renderedEl = document.getElementById("rendered");
const emptyStateEl = document.getElementById("empty-state");
const editButtonEl = document.getElementById("edit-button");

let filePath = "";
let currentContent = "";

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

async function renderPreview(content) {
  try {
    const html = await window.mdClient.renderMarkdownContent(content);
    renderedEl.innerHTML = html;
    resolveRenderedAssetUrls(renderedEl, filePath);
  } catch (error) {
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
