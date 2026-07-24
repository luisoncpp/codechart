---
id: shell-client
label: Shell Client
color: "#64748b"
icon: folder
descriptionShort: Open files in an editor or OS explorer
architectureDoc: docs/architecture/shell-client.md
---

The ShellClient seam: openInEditor(absolutePath, editor) and
revealInExplorer(absolutePath) via the Tauri opener plugin, with a mock for tests.
