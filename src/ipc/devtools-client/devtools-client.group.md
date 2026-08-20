---
id: devtools-client
label: Devtools Client
color: "#0891b2"
icon: wrench
descriptionShort: IPC client for toggling developer tools
---

The DevtoolsClient seam provides an interface to toggle the developer tools window in the application. The public facade (index.ts) exports the client contract alongside factory functions for Tauri IPC and mock implementations. Private implementations invoke the toggle_devtools Tauri command or trigger test callbacks for automated shortcuts. It is consumed by the app shell and shortcut listeners to handle F12 and Ctrl+Shift+I key bindings.
