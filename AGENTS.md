# Repository Guidelines

## Project Structure & Module Organization
`md-client` is an Electron app with a small Node CLI entrypoint and a Python
renderer for Markdown.
- `app/`: Electron main process (`main.js`), preload (`preload.js`), renderer UI
  (`renderer/`), and Python Markdown rendering (`python/render_markdown.py`).
- `bin/`: CLI entry (`mdview.js`) that launches Electron with a `.md` path.
- `tests/`: Playwright E2E tests in `tests/e2e/` with fixtures in `tests/fixtures/`.
- `docs/`: Architecture notes and screenshots (`docs/assets/`).

## Build, Test, and Development Commands
- `npm install`: install Node dependencies.
- `python -m pip install -r requirements.txt`: install Python renderer deps.
- `npm start`: launch the Electron app (no file passed).
- `node bin/mdview.js README.md`: run the CLI against a specific Markdown file.
- `npm run test:e2e`: run Playwright E2E tests.

## Coding Style & Naming Conventions
- JavaScript: 2-space indentation, double quotes, semicolons (follow existing
  files in `app/*.js` and `app/renderer/*.js`).
- File naming: use kebab-case for new files (e.g., `render-markdown.js`) unless
  extending existing camelCase patterns.
- No formatter or linter is configured; keep changes consistent with nearby code.

## Testing Guidelines
- Framework: Playwright (`playwright.config.js`).
- Test location: `tests/e2e/*.spec.js`.
- Name tests for user flows (e.g., “open file renders markdown”, “edit/save”).
- Run `npm run test:e2e` locally before PRs that affect UI or IPC.

## Commit & Pull Request Guidelines
- Commit style in history uses short, imperative, sentence-case summaries
  (e.g., “Implement popup markdown editor with live sync”).
- PRs should include:
  - A clear summary of behavior changes and affected paths.
  - Linked issue/ticket if applicable.
  - Screenshots or GIFs for UI updates (renderer/editor windows).

## Configuration Notes
- Python renderer supports `--stdin` for live preview; avoid breaking the
  `render_markdown.py` interface.
- Relative asset rendering depends on the opened Markdown file’s directory;
  verify image links when changing path logic.
