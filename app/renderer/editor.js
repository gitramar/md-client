const filePathEl = document.getElementById("file-path");
const renderedEl = document.getElementById("rendered");
const emptyStateEl = document.getElementById("empty-state");
const editorLayoutEl = document.getElementById("editor-layout");
const editorEl = document.getElementById("editor");
const doneButtonEl = document.getElementById("done-button");
const saveButtonEl = document.getElementById("save-button");
const revertButtonEl = document.getElementById("revert-button");
const dirtyIndicatorEl = document.getElementById("dirty-indicator");
const shortcutHelpButtonEl = document.getElementById("shortcut-help-button");
const formatToolbarEl = document.getElementById("format-toolbar");
const shortcutsModalEl = document.getElementById("shortcuts-modal");
const closeShortcutsButtonEl = document.getElementById("close-shortcuts-button");
const sourceLabelEl = document.getElementById("source-label");

let filePath = "";
let currentContent = "";
let fileDirty = false;
let renderTimer = null;
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

function setDirty(isDirty) {
  fileDirty = isDirty;
  saveButtonEl.disabled = !filePath || !isDirty;
  revertButtonEl.disabled = !filePath || !isDirty;
  dirtyIndicatorEl.textContent = isDirty ? "Unsaved changes" : "";
}

function setEditorState(nextValue, selectionStart, selectionEnd = selectionStart) {
  editorEl.value = nextValue;
  editorEl.focus();
  const start = Math.max(0, Math.min(selectionStart, editorEl.value.length));
  const end = Math.max(start, Math.min(selectionEnd, editorEl.value.length));
  editorEl.setSelectionRange(start, end);

  setDirty(nextValue !== currentContent);
  schedulePreviewRender(nextValue);
  if (filePath) {
    window.mdClient.notifyDraftUpdated(filePath, nextValue);
  }
}

function placeCursor(offset) {
  if (typeof offset !== "number" || Number.isNaN(offset)) {
    editorEl.focus();
    return;
  }
  const clampedOffset = Math.max(0, Math.min(offset, editorEl.value.length));
  editorEl.focus();
  editorEl.setSelectionRange(clampedOffset, clampedOffset);
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
      renderedEl.className = "markdown";
      renderedEl.innerHTML = html;
      resolveRenderedAssetUrls(renderedEl, filePath);
      return;
    }

    if (fileType === "html") {
      renderedEl.className = "";
      renderedEl.innerHTML = content ?? "";
      resolveRenderedAssetUrls(renderedEl, filePath);
      return;
    }

    if (fileType === "code") {
      const html = await window.mdClient.renderCodeContent(content, filePath);
      renderedEl.className = "";
      renderedEl.innerHTML = html;
      resolveRenderedAssetUrls(renderedEl, filePath);
      return;
    }

    renderedEl.className = "";
    renderPreformatted(content, fileType);
  } catch (error) {
    renderedEl.className = "";
    renderedEl.innerHTML = `<pre class="error">${error.message}</pre>`;
  }
}

function schedulePreviewRender(content) {
  if (renderTimer) {
    clearTimeout(renderTimer);
  }
  renderTimer = setTimeout(() => {
    renderPreview(content);
  }, 120);
}

function applyState(state) {
  filePath = state.filePath || "";
  fileType = getFileType(filePath);
  currentContent = state.content || "";
  filePathEl.textContent = filePath || "No file loaded";
  editorEl.value = currentContent;
  const isMarkdown = fileType === "markdown";
  formatToolbarEl.style.display = isMarkdown ? "flex" : "none";
  shortcutHelpButtonEl.disabled = !isMarkdown;
  shortcutHelpButtonEl.style.visibility = isMarkdown ? "visible" : "hidden";
  sourceLabelEl.textContent = isMarkdown ? "Markdown" : "Source";
  editorEl.placeholder = isMarkdown ? "Type markdown here..." : "Type here...";
  setDirty(false);
  renderPreview(currentContent);
  placeCursor(state.cursorOffset);
}

function getLineBounds(value, start, end) {
  const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const lineEndIndex = value.indexOf("\n", end);
  const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
  return { lineStart, lineEnd };
}

function toggleInlineWrap(open, close, placeholder) {
  const value = editorEl.value;
  const start = editorEl.selectionStart;
  const end = editorEl.selectionEnd;
  const selected = value.slice(start, end);
  const before = value.slice(Math.max(0, start - open.length), start);
  const after = value.slice(end, end + close.length);

  if (start !== end && before === open && after === close) {
    const nextValue =
      value.slice(0, start - open.length) +
      selected +
      value.slice(end + close.length);
    setEditorState(nextValue, start - open.length, end - open.length);
    return;
  }

  if (start === end) {
    const text = placeholder || "text";
    const wrapped = `${open}${text}${close}`;
    const nextValue = value.slice(0, start) + wrapped + value.slice(end);
    setEditorState(nextValue, start + open.length, start + open.length + text.length);
    return;
  }

  const wrapped = `${open}${selected}${close}`;
  const nextValue = value.slice(0, start) + wrapped + value.slice(end);
  setEditorState(nextValue, start + open.length, end + open.length);
}

function togglePrefix(prefix) {
  const value = editorEl.value;
  const start = editorEl.selectionStart;
  const end = editorEl.selectionEnd;
  const { lineStart, lineEnd } = getLineBounds(value, start, end);
  const block = value.slice(lineStart, lineEnd);
  const lines = block.split("\n");
  const allHavePrefix = lines.every((line) => line.startsWith(prefix));
  const nextLines = allHavePrefix
    ? lines.map((line) => line.slice(prefix.length))
    : lines.map((line) => (line.length ? `${prefix}${line}` : prefix.trimEnd()));
  const nextBlock = nextLines.join("\n");
  const nextValue = value.slice(0, lineStart) + nextBlock + value.slice(lineEnd);
  const nextSelectionStart = allHavePrefix
    ? Math.max(lineStart, start - prefix.length)
    : start + prefix.length;
  setEditorState(nextValue, nextSelectionStart, nextSelectionStart + nextBlock.length);
}

function toggleOrderedList() {
  const value = editorEl.value;
  const start = editorEl.selectionStart;
  const end = editorEl.selectionEnd;
  const { lineStart, lineEnd } = getLineBounds(value, start, end);
  const block = value.slice(lineStart, lineEnd);
  const lines = block.split("\n");
  const orderedPrefix = /^\d+\.\s/;
  const allOrdered = lines.every((line) => orderedPrefix.test(line));
  const nextLines = allOrdered
    ? lines.map((line) => line.replace(orderedPrefix, ""))
    : lines.map((line, index) =>
        line.length ? `${index + 1}. ${line.replace(orderedPrefix, "")}` : `${index + 1}. `
      );
  const nextBlock = nextLines.join("\n");
  const nextValue = value.slice(0, lineStart) + nextBlock + value.slice(lineEnd);
  setEditorState(nextValue, lineStart, lineStart + nextBlock.length);
}

function toggleHeading() {
  const value = editorEl.value;
  const start = editorEl.selectionStart;
  const { lineStart, lineEnd } = getLineBounds(value, start, start);
  const line = value.slice(lineStart, lineEnd);
  const match = line.match(/^(#{1,3})\s+/);

  let nextLine;
  if (!match) {
    nextLine = `# ${line}`;
  } else if (match[1].length === 1) {
    nextLine = `## ${line.slice(match[0].length)}`;
  } else if (match[1].length === 2) {
    nextLine = `### ${line.slice(match[0].length)}`;
  } else {
    nextLine = line.slice(match[0].length);
  }

  const nextValue = value.slice(0, lineStart) + nextLine + value.slice(lineEnd);
  setEditorState(nextValue, lineStart, lineStart + nextLine.length);
}

function toggleCodeBlock() {
  const value = editorEl.value;
  const start = editorEl.selectionStart;
  const end = editorEl.selectionEnd;
  const selected = value.slice(start, end) || "code";
  const wrapped = `\`\`\`\n${selected}\n\`\`\``;
  const nextValue = value.slice(0, start) + wrapped + value.slice(end);
  setEditorState(nextValue, start + 4, start + 4 + selected.length);
}

function applyFormatting(action) {
  if (fileType !== "markdown") {
    return;
  }
  switch (action) {
    case "bold":
      toggleInlineWrap("**", "**", "bold text");
      break;
    case "italic":
      toggleInlineWrap("*", "*", "italic text");
      break;
    case "code":
      toggleInlineWrap("`", "`", "code");
      break;
    case "link":
      toggleInlineWrap("[", "](https://example.com)", "link text");
      break;
    case "heading":
      toggleHeading();
      break;
    case "bullet-list":
      togglePrefix("- ");
      break;
    case "ordered-list":
      toggleOrderedList();
      break;
    case "quote":
      togglePrefix("> ");
      break;
    case "code-block":
      toggleCodeBlock();
      break;
    default:
      break;
  }
}

function toggleShortcutsModal(show) {
  shortcutsModalEl.style.display = show ? "flex" : "none";
}

async function saveIfDirty() {
  if (!filePath || !fileDirty) {
    return;
  }
  await window.mdClient.saveMarkdown(filePath, editorEl.value);
  currentContent = editorEl.value;
  setDirty(false);
}

editorEl.addEventListener("input", () => {
  const next = editorEl.value;
  setDirty(next !== currentContent);
  schedulePreviewRender(next);
  if (filePath) {
    window.mdClient.notifyDraftUpdated(filePath, next);
  }
});

formatToolbarEl.addEventListener("click", (event) => {
  const button = event.target.closest("[data-format]");
  if (!button) {
    return;
  }
  applyFormatting(button.getAttribute("data-format"));
});

formatToolbarEl.addEventListener("mousedown", (event) => {
  if (event.target.closest("[data-format]")) {
    event.preventDefault();
  }
});

shortcutHelpButtonEl.addEventListener("click", () => {
  if (fileType !== "markdown") {
    return;
  }
  toggleShortcutsModal(true);
});

closeShortcutsButtonEl.addEventListener("click", () => {
  toggleShortcutsModal(false);
  editorEl.focus();
});

shortcutsModalEl.addEventListener("click", (event) => {
  if (event.target === shortcutsModalEl) {
    toggleShortcutsModal(false);
    editorEl.focus();
  }
});

saveButtonEl.addEventListener("click", async () => {
  if (!filePath || !fileDirty) {
    return;
  }
  await saveIfDirty();
});

revertButtonEl.addEventListener("click", async () => {
  if (!filePath || !fileDirty) {
    return;
  }
  editorEl.value = currentContent;
  setDirty(false);
  await renderPreview(currentContent);
  if (filePath) {
    window.mdClient.notifyDraftUpdated(filePath, currentContent);
  }
});

window.addEventListener("keydown", async (event) => {
  const withMod = event.ctrlKey || event.metaKey;
  if (!withMod) {
    if (event.key === "Escape" && shortcutsModalEl.style.display === "flex") {
      event.preventDefault();
      toggleShortcutsModal(false);
      editorEl.focus();
    }
    return;
  }

  const key = event.key.toLowerCase();
  if (key === "s") {
    event.preventDefault();
    await saveIfDirty();
    return;
  }
  if (key === "enter") {
    event.preventDefault();
    await saveIfDirty();
    await window.mdClient.finishEditing();
    return;
  }
  if (fileType !== "markdown") {
    return;
  }
  if (key === "b") {
    event.preventDefault();
    applyFormatting("bold");
    return;
  }
  if (key === "i") {
    event.preventDefault();
    applyFormatting("italic");
    return;
  }
  if (key === "k") {
    event.preventDefault();
    applyFormatting("link");
    return;
  }
  if (key === "`") {
    event.preventDefault();
    applyFormatting("code");
    return;
  }
  if (event.code === "Slash") {
    event.preventDefault();
    toggleShortcutsModal(true);
    return;
  }
  if (event.shiftKey && event.code === "Digit8") {
    event.preventDefault();
    applyFormatting("bullet-list");
    return;
  }
  if (event.shiftKey && event.code === "Digit7") {
    event.preventDefault();
    applyFormatting("ordered-list");
    return;
  }
  if (event.shiftKey && key === "h") {
    event.preventDefault();
    applyFormatting("heading");
    return;
  }
  if (event.shiftKey && event.code === "Period") {
    event.preventDefault();
    applyFormatting("quote");
    return;
  }
  if (event.shiftKey && key === "c") {
    event.preventDefault();
    applyFormatting("code-block");
  }
});

doneButtonEl.addEventListener("click", async () => {
  await saveIfDirty();
  await window.mdClient.finishEditing();
});

window.mdClient.onEditorInit((state) => {
  emptyStateEl.style.display = "none";
  editorLayoutEl.style.display = "grid";
  applyState(state);
});

window.mdClient.onEditorSync((state) => {
  if (state.filePath && state.filePath !== filePath && fileDirty) {
    return;
  }
  if (!fileDirty && state.content !== undefined) {
    applyState({
      filePath: state.filePath || filePath,
      content: state.content,
      cursorOffset: state.cursorOffset
    });
    return;
  }
  placeCursor(state.cursorOffset);
});

window.mdClient.onFileChanged(async () => {
  if (!filePath || fileDirty) {
    return;
  }
  try {
    currentContent = await window.mdClient.readMarkdown(filePath);
    editorEl.value = currentContent;
    await renderPreview(currentContent);
  } catch (error) {
    renderedEl.innerHTML = `<pre class="error">${error.message}</pre>`;
  }
});
