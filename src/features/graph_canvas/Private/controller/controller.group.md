---
id: canvas_controller
label: Canvas Controller
color: "#4f46e5"
icon: gear
descriptionShort: Click/zoom handlers & transient UI state
---

The thin adapter between React Flow events and the session store: node/pane click routing (select, toggle, context menu), viewport move → zoom-level updates, and `CanvasUiState` — the transient find-bar/diff-modal flags shared with the toolbar menus.
