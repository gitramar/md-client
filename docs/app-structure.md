# md-client: App Structure and Flow

This document is a longer example Markdown file you can open in mdview. It
walks through the project structure, runtime behavior, and testing strategy.

## Goals

- Provide a standalone Markdown viewer that is easy to invoke from the CLI.
- Render Markdown into HTML inside an Electron window.
- Keep a dark theme by default.
- Auto-refresh when the Markdown file changes.

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

## App Startup Sequence

1. The user runs `node bin\mdview.js path\to\file.md`.
2. The CLI entrypoint launches Electron and passes the app root plus the file path.
3. Electron loads `app/main.js`.
4. The main process resolves the Markdown file path from `process.argv`.
5. A `BrowserWindow` is created and `app/renderer/index.html` is loaded.
6. The renderer calls `window.mdClient.getFilePath()`.
7. The renderer calls `window.mdClient.renderMarkdown(path)` to request HTML.
8. The main process spawns the Python renderer and returns HTML.
9. The HTML is injected into the page.

## Main Process

The main process controls:

- Window creation and default theme.
- Watching the Markdown file for changes.
- IPC handlers for:
  - `get-file-path`
  - `render-markdown`

### Rendering Flow

When `render-markdown` is invoked:

1. Validate the file exists.
2. Spawn `python app/python/render_markdown.py <file>`.
3. Collect stdout as HTML.
4. Return HTML to the renderer.
5. On error, surface the message to the renderer.

## Renderer Process

The renderer is a small client:

- Fetches the file path from the main process.
- Calls the render IPC endpoint.
- Injects HTML into the document.
- Shows a friendly empty state when no file is provided.

The UI is optimized for readable, dark themed docs with:

- A top bar showing the app name and the open path.
- A centered content column for the Markdown.
- Styling for headings, code blocks, tables, and blockquotes.

## Python Renderer

The Python script `app/python/render_markdown.py` is intentionally simple:

- Reads the file in UTF-8.
- Uses the `markdown` package to convert to HTML.
- Enables:
  - `fenced_code`
  - `tables`
  - `codehilite`

If the file cannot be read, it returns a non-zero exit code and the error text
goes to stderr.

## Auto-Refresh

The main process uses `fs.watch()` to detect file changes. When the file changes
the renderer gets a `file-changed` IPC message and reloads the Markdown content.

## E2E Test (Playwright + Electron)

The E2E test launches Electron directly:

```
const electronApp = await electron.launch({
  args: [appPath, filePath]
});
```

Then it:

- Waits for the heading to appear.
- Asserts the heading text.
- Confirms that the table exists.

This keeps the core flow covered while the app is still small.

## Ideas for Future Enhancements

- Add CLI flags:
  - `--theme=dark|light`
  - `--watch=false`
  - `--css path\to\custom.css`
  - `--title "Custom Title"`
- Jump to a section anchor, for example `#usage` or `#tests`.
- Show file open dialog if no path is provided.
- Track recent files in app state.

## Troubleshooting

If the window opens without content:

- Confirm the file path is correct.
- Check `python` is on your PATH.
- Ensure `pip install -r requirements.txt` has run successfully.

If the app does not open:

- Confirm Electron is installed: `npm install`.
- Launch with `npm start` to check for startup errors.
