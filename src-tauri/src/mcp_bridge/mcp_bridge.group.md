---
id: mcp_bridge
label: MCP Bridge
color: "#0284c7"
icon: radio
facades:
  - mod.rs
descriptionShort: Loopback HTTP/JSON bridge connecting the stdio MCP server (`codechart --mcp`) to the live desktop window
---

Binds an ephemeral loopback port (`127.0.0.1:0`) with a per-instance bearer token, registers the live instance in `~/.codechart/instances.json`, and routes authenticated `/rpc` calls to the active Tauri webview.
