---
id: playtest_mcp
label: Playtest MCP
color: "#0ea5e9"
icon: terminal
facades:
  - index.ts
descriptionShort: MCP server driving Codechart WebView2 over CDP
architectureDoc: docs/architecture/playtest-mcp.md
---

Standalone Node 24 MCP server that launches Codechart with WebView2 remote debugging, dispatches pointer/wheel/keyboard inputs and screenshots over CDP, and calls the dev-only playtest bridge. Public entry point is `index.ts`.
