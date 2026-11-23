---
id: mcp_server
label: MCP Server
color: "#0369a1"
icon: plug
facades:
  - mod.rs
descriptionShort: Stdio MCP server (`codechart.exe --mcp`) proxying assistant tool calls to the live window, with headless fallbacks
architectureDoc: docs/architecture/review-stack-mcp.md
---

Newline-delimited JSON-RPC over stdin/stdout. Tool arguments are normalized against each tool's JSON Schema (defaults, types, enums, bounds), then forwarded to the desktop window through the loopback `mcp_bridge`. When no window answers, `get_architecture_summary`, `analyze_diff_impact` and `export_review_comments` run in-process against `projectRoot`.
