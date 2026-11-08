# Claude Instructions

## Commit & PR Messages

- Do not include links to Claude chat sessions in commit messages, PR descriptions, or anywhere else in the repository.

When script.js or style.css changes, bump the ?v= value on both in index.html.
GitHub Pages caches them for 10 minutes, so the new version tag is what makes browsers fetch new code.
