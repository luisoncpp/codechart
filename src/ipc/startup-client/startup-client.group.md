---
id: startup-client
label: Startup Client
color: "#0d9488"
icon: plug
descriptionShort: Query CLI startup project path via IPC
---

The StartupClient seam retrieves the initial project path passed via CLI arguments on application launch. The public facade (index.ts) provides the client interface along with factory functions for Tauri IPC and mock implementations. Private implementations call the get_startup_project_path Tauri command or return configured test paths. It is consumed on startup to auto-load projects when opened directly from the command line.
