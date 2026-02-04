const filePathEl = document.getElementById("file-path");
const renderedEl = document.getElementById("rendered");
const emptyStateEl = document.getElementById("empty-state");
const editorLayoutEl = document.getElementById("editor-layout");
const editorEl = document.getElementById("editor");
const saveButtonEl = document.getElementById("save-button");
const revertButtonEl = document.getElementById("revert-button");
const dirtyIndicatorEl = document.getElementById("dirty-indicator");

let filePath = "";
let currentContent = "";
let fileDirty = false;
let renderTimer = null;

function setDirty(isDirty) {
  fileDirty = isDirty;
  saveButtonEl.disabled = !filePath || !isDirty;
  revertButtonEl.disabled = !filePath || !isDirty;
  dirtyIndicatorEl.textContent = isDirty ? "Unsaved changes" : "";
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

async function renderPreview(content) {
  try {
    const html = await window.mdClient.renderMarkdownContent(content);
    renderedEl.innerHTML = html;
  } catch (error) {
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
  currentContent = state.content || "";
  filePathEl.textContent = filePath || "No file loaded";
  editorEl.value = currentContent;
  setDirty(false);
  renderPreview(currentContent);
  placeCursor(state.cursorOffset);
}

editorEl.addEventListener("input", () => {
  const next = editorEl.value;
  setDirty(next !== currentContent);
  schedulePreviewRender(next);
  if (filePath) {
    window.mdClient.notifyDraftUpdated(filePath, next);
  }
});

saveButtonEl.addEventListener("click", async () => {
  if (!filePath || !fileDirty) {
    return;
  }
  await window.mdClient.saveMarkdown(filePath, editorEl.value);
  currentContent = editorEl.value;
  setDirty(false);
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
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    if (filePath && fileDirty) {
      await window.mdClient.saveMarkdown(filePath, editorEl.value);
      currentContent = editorEl.value;
      setDirty(false);
    }
  }
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
