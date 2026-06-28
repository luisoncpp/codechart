---
id: diff_visualizer
label: Diff Visualizer
color: "#9333ea"
icon: dialog
descriptionShort: Paste or git diff UI
---

Modal and overlay bar for starting and stopping diff visualization on the canvas. Wires user input to GraphSessionStore (paste text or base/head commits). Public surface is the facade (index.ts); DiffModal and DiffOverlayBar are private.
