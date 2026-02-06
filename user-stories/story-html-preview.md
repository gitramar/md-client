# User Story: Open HTML Directly

## Summary
As a user, I want `.html` files to open directly in the viewer so I can preview static HTML output quickly.

## Context
Some tools emit HTML reports that I want to inspect without launching a browser manually.

## Acceptance Criteria
- The CLI accepts `.html` and `.htm` paths.
- HTML is loaded directly into the renderer without Markdown conversion.
- Scripts are disabled by default for safety.
- A warning appears if the file includes external resource links.

## Notes
- Consider adding a safe-list for enabling scripts in trusted files.
