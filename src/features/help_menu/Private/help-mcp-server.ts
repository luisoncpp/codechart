// @Architecture(descriptionShort="Markdown documentation content for the MCP Server help topic")

export const MCP_SERVER_MARKDOWN = `# CodeChart MCP Server (\`codechart-mcp\`)

\`codechart-mcp\` is a stdio **Model Context Protocol (MCP)** server that lets a coding assistant (Claude Code, Codex, Cursor, Antigravity, …) read your architecture graph, compute a diff's blast radius, populate the **Review Stack** drawer, and drive the live CodeChart canvas.

For a ready-made review workflow built on these tools, see **Help → Code review skill / prompt**.

## Requirements

- **Node.js 24+** (runs the TypeScript entry point directly, no build step).
- **A CodeChart source checkout** with \`npm install\` already run — the server lives at \`tools/codechart-mcp/index.ts\` and imports \`@modelcontextprotocol/sdk\` and \`zod\` from that checkout's \`node_modules\`.
- **CodeChart Desktop running with a project open** for live tools. Headless mode (below) additionally needs a built \`codechart-cli\` (or \`cargo\` on \`PATH\`).

## Registering the server

Replace \`<codechart>\` with the absolute path of your checkout.

**Claude Code** (CLI):

\`\`\`
claude mcp add codechart -- node <codechart>/tools/codechart-mcp/index.ts
\`\`\`

**JSON config** (Claude Code \`.mcp.json\`, Cursor \`.cursor/mcp.json\`, Antigravity, Claude Desktop):

\`\`\`json
{
  "mcpServers": {
    "codechart": {
      "command": "node",
      "args": ["<codechart>/tools/codechart-mcp/index.ts"]
    }
  }
}
\`\`\`

**Codex** (\`~/.codex/config.toml\`):

\`\`\`toml
[mcp_servers.codechart]
command = "node"
args = ["<codechart>/tools/codechart-mcp/index.ts"]
\`\`\`

## How it connects

When CodeChart Desktop opens a project it starts a loopback bridge on \`127.0.0.1\` (random port, per-instance bearer token) and registers it in \`~/.codechart/instances.json\`. The MCP server reads that file and talks to the **most recently started instance that answers its health check**. With several windows open, the last one launched wins.

## Tools (14)

Ids such as \`moduleId\` and \`path\` are repo-relative POSIX paths (e.g. \`src/app/App.tsx\`).

| Tool | Purpose | Key arguments | Needs |
|---|---|---|---|
| \`get_active_context\` | Open project, zoom level, selection, active diff id, review progress, active cohort | — | App |
| \`get_architecture_summary\` | Group tree, facades, tags, module/edge counts, diagnostics | \`groupId?\`, \`projectRoot?\` | App or headless |
| \`analyze_diff_impact\` | Foundation-first topological \`layers\`, transitive \`blastRadius\`, \`affectedGroupIds\`, \`newDiagnostics\` | \`mode?\` (loads the diff first), \`baseRef\`/\`headRef\`/\`diffText\`, \`maxDepth\` (1–8, default 3), \`projectRoot?\` | App or headless |
| \`load_diff\` | Apply a diff overlay to the canvas; returns \`diffId\` and affected module ids | \`mode\`: \`commits\` (\`baseRef\`, \`headRef\`), \`working-tree\` (\`baseRef\`), \`paste\` (\`diffText\`) | App |
| \`set_review_stack\` | Replace the Review Stack: title, summary, cohorts (layers), merge blockers | \`title\`, \`summary\`, \`cohorts[]\` (\`id\`, \`title\`, \`rationale\`, \`dependsOn\`, \`moduleIds\`), \`blockers[]\` | Active diff |
| \`upsert_findings\` | Add or update findings by \`id\`, shown inline in Preview Frames and in the Findings tab | \`findings[]\` (\`id\`, \`path\`, \`side\`, \`startLine\`, \`endLine\`, \`severity\`, \`title\`, \`body\`, \`layerId?\`, \`blocker?\`, \`suggestedFix?\`) | Active diff |
| \`clear_review_stack\` | Delete the stack and findings for the active diff | — | Active diff |
| \`focus_layer\` | Spotlight one cohort's \`moduleIds\` and center its first module | \`cohortId\` (\`null\` clears), \`spotlight?\`: \`dim-others\` / \`highlight\` / \`off\` | Stack |
| \`show_blast_radius\` | Badge downstream dependents \`SRC\` / \`R+1\` / \`R+2\` … | \`moduleId?\` (default: all changed modules), \`maxDepth?\` | App |
| \`navigate_to\` | Center a module and optionally open its Preview Frame at a line | \`path\`, \`line?\`, \`symbol?\`, \`openPreview?\` | App |
| \`get_review_state\` | Reviewed/unreviewed paths, human Review Notes, cohorts, finding statuses | \`includeResolved?\` | App |
| \`set_files_reviewed\` | Check or uncheck diffed files as reviewed | \`paths[]\`, \`reviewed\` | Active diff |
| \`resolve_finding\` | Set a finding to \`open\`, \`resolved\`, or \`dismissed\` | \`findingId\`, \`status\` | Stack |
| \`export_review_comments\` | Format findings + Review Notes as \`markdown\`, \`github\` (PR review JSON) or \`gitlab\` (MR discussions JSON). GitLab positions carry \`base_sha\`/\`start_sha\`/\`head_sha\`, resolved with git from the diff's refs when not passed; otherwise the payload has \`missingShas: true\` + \`warning\`. Formats only — it never posts | \`format\`, \`includeResolved?\`, \`includeReviewNotes?\`, \`projectRoot?\`, \`diffId?\`, \`baseSha?\`/\`startSha?\`/\`headSha?\` (GitLab) | App or headless |

Finding severities: \`critical\`, \`major\`, \`minor\`, \`trivial\`, \`info\`. CodeChart tools never return file contents — the assistant reads source with its own file tools.

## Resources

- \`codechart://session/active\` — JSON snapshot of the active window context.
- \`codechart://review/notes\` — Review Notes, findings (including resolved) and reviewed-file progress.

## Persistence

Review Stacks and findings are saved per diff in \`<project>/.codechart/review-stacks.json\` (keyed by \`diffId\`), so they survive restarts. **Settings → Clear review info** deletes them together with Review Notes and reviewed checkmarks.

## Headless mode

If no desktop instance answers, \`get_architecture_summary\`, \`analyze_diff_impact\` and \`export_review_comments\` fall back to \`codechart-cli\` and the \`.codechart/\` files, provided you pass \`projectRoot\` (or set \`CODECHART_PROJECT_ROOT\`). Headless \`export_review_comments\` uses the most recent stack unless you pass \`diffId\`. Every other tool needs the app.

## Environment variables

| Variable | Effect |
|---|---|
| \`CODECHART_PROJECT_ROOT\` | Default \`projectRoot\` for headless mode |
| \`CODECHART_CLI_BIN\` | Path to the \`codechart-cli\` binary. Default: newest of \`src-tauri/target/{release,debug}\`, else \`cargo run\` |
| \`CODECHART_MCP_REGISTRY\` | Alternative path to \`instances.json\` |

## Troubleshooting

| Error | Fix |
|---|---|
| \`No running CodeChart desktop instance found\` | Open CodeChart Desktop with a project, or pass \`projectRoot\` for the headless tools |
| \`No live CodeChart desktop instance responded\` | The registry is stale (app crashed). Restart CodeChart |
| \`No project loaded\` | Open a project folder in the window the server connected to |
| \`No active diff overlay in CodeChart\` | Call \`load_diff\` (or \`analyze_diff_impact\` with \`mode\`) before stack, finding or reviewed-file tools |
| Tools act on the wrong window | Close the other CodeChart windows; the newest instance is used |
| Server fails to start (\`Cannot find module\`) | Run \`npm install\` in the CodeChart checkout and check \`node --version\` ≥ 24 |
`;
