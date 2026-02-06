# User Story: Additional Markdown Extensions

## Summary
As a user, I want the viewer to open additional Markdown extensions (e.g., `.markdown`, `.mdown`, `.mdx`) so I can use the tool across more repositories without renaming files.

## Context
Right now, the CLI targets `.md` files only. Many projects use alternative Markdown extensions.

## Acceptance Criteria
- The CLI accepts `.markdown`, `.mdown`, and `.mdx` paths.
- Files render using the existing Markdown pipeline.
- The UI indicates the opened file path and extension.
- If the extension is unsupported, the app shows a clear error message.

## Notes
- `.mdx` should render as Markdown (without React component evaluation).
