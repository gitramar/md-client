# md-client: App Structure and Current Status

This document reflects the current application flow after adding popup editing.

## Goals

- Open a local `.md` file from CLI with near-zero setup friction.
- Render Markdown by default in the main Electron window.
- Allow editing in a separate window while keeping the rendered view visible.
- Keep edits and preview synchronized in real time.

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
  tests/
    e2e/
      open-file.spec.js
    fixtures/
      sample.md
  package.json
  requirements.txt
  README.md
  playwright.config.js
```

## Startup Sequence

1. User runs `node bin\mdview.js path\to\file.md`.
2. `bin/mdview.js` launches Electron with the app path and markdown path args.
3. `app/main.js` resolves the target `.md` file and creates the main window.
4. Main window loads `app/renderer/index.html` (render-only mode).
5. Renderer requests file contents and rendered HTML through preload IPC.
6. Main process renders via Python (`render_markdown.py`) and returns HTML.

## Window Model

- Main window:
  - Rendered Markdown only.
  - `Edit` button to open editor popup.
  - `Ctrl/Cmd + Click` on rendered text opens popup and requests cursor jump.
- Editor popup window:
  - Markdown textarea + live preview side-by-side.
  - Formatting toolbar for common markdown operations.
  - Shortcut help modal with discoverable key bindings.
  - Save/Revert actions.
  - `Ctrl/Cmd + S` save shortcut.

## Sync Behavior

- Editor typing sends draft updates to main process.
- Main process broadcasts draft updates to the main window preview.
- Main window updates rendered output live while edits are unsaved.
- Saving writes markdown to disk and clears draft state.
- File watcher (`fs.watch`) notifies both windows when file changes on disk.

## IPC Surface

Exposed through `app/preload.js`:

- `getFilePath`
- `readMarkdown`
- `saveMarkdown`
- `renderMarkdown`
- `renderMarkdownContent`
- `openEditor`
- `notifyDraftUpdated`
- `onFileChanged`
- `onMarkdownUpdated`
- `onEditorInit`
- `onEditorSync`

## Cursor Jump Behavior

`Ctrl/Cmd + Click` captures nearby rendered text, then main process attempts to
map that text back into markdown source and sets cursor position in the editor.
Matching is text-based and best-effort by design.

## Python Renderer

`app/python/render_markdown.py` supports:

- file path input
- `--stdin` input (used for live preview rendering)

Enabled markdown extensions:

- `fenced_code`
- `tables`
- `codehilite`

## Test Coverage

`tests/e2e/open-file.spec.js` currently covers:

- opening and rendering markdown in the main window
- opening popup editor, editing, and saving to disk
- `Ctrl/Cmd + Click` launching editor and cursor jump near clicked content
- formatting shortcuts and shortcut-help modal behavior

## Current Status

- Render-first + popup edit flow is implemented.
- Live compare between rendered and raw markdown is implemented.
- Keyboard shortcut and click-modifier entry points are implemented.
- Toolbar formatting actions and help overlay are implemented.
