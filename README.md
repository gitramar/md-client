# md-client

Standalone Markdown viewer for CLI workflows. Launch it with a file path and it
opens a dark-mode Electron window with rendered Markdown. Editing happens in a
separate popup with live preview and formatting tools.

## Setup

```bash
npm install
python -m pip install -r requirements.txt
```

## Usage

```bash
node bin/mdview.js README.md
```

Optional: `npm link` to make `mdview` available on your PATH.

## Interaction Model

- Main window starts in render mode.
- Click `Edit` to open the popup editor.
- `Ctrl/Cmd + Click` in rendered content opens editor and jumps near the
  clicked source location.
- Opening editor hides the main window; `Done Editing` returns to render view.
- While editing, the main window preview stays in sync in real time.

## Editor Features

- Source editor + live preview side-by-side.
- Save, Revert, and Done Editing actions.
- Formatting toolbar:
  - Bold, Italic, Inline Code, Link
  - Heading toggle
  - Bullet list / Ordered list toggle
  - Quote toggle
  - Code block insertion
- Shortcut help modal (`?` button or `Ctrl/Cmd + /`).

## Keyboard Shortcuts

- `Ctrl/Cmd + B`: Bold
- `Ctrl/Cmd + I`: Italic
- `Ctrl/Cmd + \``: Inline code
- `Ctrl/Cmd + K`: Link
- `Ctrl/Cmd + Shift + H`: Heading toggle
- `Ctrl/Cmd + Shift + 8`: Bullet list toggle
- `Ctrl/Cmd + Shift + 7`: Ordered list toggle
- `Ctrl/Cmd + Shift + .`: Quote toggle
- `Ctrl/Cmd + Shift + C`: Code block
- `Ctrl/Cmd + /`: Open shortcuts help
- `Ctrl/Cmd + S`: Save
- `Ctrl/Cmd + Enter`: Save and Done Editing

## Screenshots

Main render window:

![Main render window](docs/assets/main-render.png)

Popup editor window:

![Popup editor window](docs/assets/editor-popup.png)

## Tests

```bash
npm run test:e2e
```
