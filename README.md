# md-client

Standalone Markdown viewer for CLI workflows. Launch it with a file path and it
opens a dark-mode Electron window with editable Markdown and live preview.

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

## Tests

```bash
npm run test:e2e
```
