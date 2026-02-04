# md-client: App Structure and Flow

This document reflects the current implementation status.

## Goals

- Open a local `.md` file from CLI with minimal friction.
- Render Markdown in the main Electron window by default.
- Provide a dedicated popup editor for source editing and live preview.
- Keep renderer/editor state synchronized during edits.

## Repository Layout

```
md-client/
  app/
    main.js
    preload.js
    python/
      render_markdown.py
    renderer/
      index.html
      renderer.js
      editor.html
      editor.js
      styles.css
  bin/
    mdview.js
  docs/
    app-structure.md
    assets/
      main-render.png
      editor-popup.png
  tests/
    e2e/
      open-file.spec.js
    fixtures/
      sample.md
  README.md
  package.json
  requirements.txt
  playwright.config.js
```

## Runtime Sequence

1. User runs `node bin\mdview.js path\to\file.md`.
2. CLI script launches Electron with app path + markdown path args.
3. `app/main.js` resolves the markdown file path and opens main window.
4. Main renderer (`index.html` + `renderer.js`) requests source/HTML via IPC.
5. Main process renders markdown via Python (`render_markdown.py`).
6. Main window shows rendered content.

## Window Model

- Main window:
  - Render-only markdown view
  - `Edit` button
  - `Ctrl/Cmd + Click` on rendered text to open editor near source location
- Editor window:
  - Source textarea + live preview
  - Formatting toolbar
  - Shortcut help modal
  - Save/Revert/Done Editing actions

When editor opens, main window is hidden. On `Done Editing`, editor closes and
main window is restored.

## Synchronization

- Editor typing sends draft updates to main process.
- Main process forwards draft updates to main window for live preview sync.
- Save writes markdown to disk and clears draft state.
- `fs.watch()` broadcasts file changes to both windows.

## IPC Surface (`preload.js`)

- `getFilePath`
- `readMarkdown`
- `saveMarkdown`
- `renderMarkdown`
- `renderMarkdownContent`
- `openEditor`
- `finishEditing`
- `notifyDraftUpdated`
- `onFileChanged`
- `onMarkdownUpdated`
- `onEditorInit`
- `onEditorSync`

## Formatting and Shortcuts

Supported editor shortcuts:

- `Ctrl/Cmd + B`, `Ctrl/Cmd + I`, `Ctrl/Cmd + \``, `Ctrl/Cmd + K`
- `Ctrl/Cmd + Shift + H`
- `Ctrl/Cmd + Shift + 8`, `Ctrl/Cmd + Shift + 7`
- `Ctrl/Cmd + Shift + .`, `Ctrl/Cmd + Shift + C`
- `Ctrl/Cmd + /` for shortcut help
- `Ctrl/Cmd + S` save
- `Ctrl/Cmd + Enter` save + done editing

Toolbar buttons intentionally prevent focus-steal on click, so selection/cursor
does not jump while applying formatting.

## Relative Asset Rendering

Rendered markdown image/link paths are rewritten relative to the currently open
markdown file so local assets resolve correctly (for example `docs/assets/*.png`
from `README.md`).

## Python Renderer

`app/python/render_markdown.py` supports:

- file path input
- `--stdin` input (used for live preview rendering)

Enabled markdown extensions:

- `fenced_code`
- `tables`
- `codehilite`

## Test Coverage

`tests/e2e/open-file.spec.js` covers:

- open + render markdown
- popup edit/save flow
- `Ctrl/Cmd + Click` cursor jump open flow
- README screenshot image rendering
- formatting shortcuts + shortcuts modal
