# User Story: Source Code Viewing with Highlighting

## Summary
As a user, I want code files (e.g., `.js`, `.ts`, `.py`) to open with syntax highlighting so I can review source quickly without switching tools.

## Context
I often inspect scripts and snippets during CLI workflows.

## Acceptance Criteria
- The CLI accepts a configurable list of code extensions.
- Code is rendered in a monospace block with syntax highlighting.
- Line numbers are visible.
- The viewer does not modify or wrap long lines by default.

## Notes
- Initial extension set: `.js`, `.ts`, `.py`, `.json`, `.yaml`, `.yml`.
