# User Story: Plain Text Rendering

## Summary
As a user, I want `.txt` files to open in the viewer so I can quickly read text notes with consistent styling.

## Context
I frequently store notes in plain text and want a fast, read-only view.

## Acceptance Criteria
- The CLI accepts `.txt` paths.
- Plain text is rendered in a monospace, preformatted block.
- Line breaks and spacing are preserved.
- The UI clearly labels the file type as Plain Text.

## Notes
- No Markdown parsing should be applied to `.txt` files.
