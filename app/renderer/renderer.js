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
  }, 180);
}

async function loadMarkdown() {
  filePath = await window.mdClient.getFilePath();
  if (!filePath) {
    editorLayoutEl.style.display = "none";
    renderedEl.innerHTML = "";
    emptyStateEl.style.display = "flex";
    filePathEl.textContent = "No file loaded";
    editorEl.value = "";
    setDirty(false);
    return;
  }

  filePathEl.textContent = filePath;
  emptyStateEl.style.display = "none";
  editorLayoutEl.style.display = "grid";

  try {
    currentContent = await window.mdClient.readMarkdown(filePath);
    editorEl.value = currentContent;
    setDirty(false);
    await renderPreview(currentContent);
  } catch (error) {
    renderedEl.innerHTML = `<pre class="error">${error.message}</pre>`;
  }
}

editorEl.addEventListener("input", () => {
  const next = editorEl.value;
  setDirty(next !== currentContent);
  schedulePreviewRender(next);
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

window.mdClient.onFileChanged(() => {
  if (fileDirty) {
    return;
  }
  loadMarkdown();
});

loadMarkdown();
