// @Architecture(descriptionShort="Markdown documentation content for the MCP Server help topic")

/** Stands for the installed executable in the snippets; `withExecutablePath` fills it in. */
const EXECUTABLE_PLACEHOLDER = "<codechart.exe>";
const UNKNOWN_PATH_NOTE =
  "Replace `<codechart.exe>` with the absolute path of the installed executable (by default `%LOCALAPPDATA%/codechart/codechart.exe`), using forward slashes.";
const KNOWN_PATH_NOTE = "The snippets below already point at this installation's executable.";

export const MCP_SERVER_MARKDOWN = `# CodeChart MCP Server (\`codechart --mcp\`)

The CodeChart executable is also a stdio **Model Context Protocol (MCP)** server. Started with \`--mcp\`, it opens no window and lets a coding assistant (Claude Code, Codex, Cursor, Antigravity, …) read your architecture graph, compute a diff's blast radius, populate the **Review Stack** drawer, and drive the live CodeChart canvas.

For a ready-made review workflow built on these tools, see **Help → Code review skill / prompt**.

## Requirements

- **CodeChart Desktop installed.** Nothing else: no Node.js, no source checkout.
- **CodeChart Desktop running with a project open** for live tools. Headless mode (below) works with the app closed.

## Registering the server

${UNKNOWN_PATH_NOTE}

**Claude Code** (CLI):

\`\`\`
claude mcp add codechart -- "${EXECUTABLE_PLACEHOLDER}" --mcp
\`\`\`

**JSON config** (Claude Code \`.mcp.json\`, Cursor \`.cursor/mcp.json\`, Antigravity, Claude Desktop):

\`\`\`json
{
  "mcpServers": {
    "codechart": {
      "command": "${EXECUTABLE_PLACEHOLDER}",
      "args": ["--mcp"]
    }
  }
}
\`\`\`

**Codex** (\`~/.codex/config.toml\`):

\`\`\`toml
[mcp_servers.codechart]
command = "${EXECUTABLE_PLACEHOLDER}"
args = ["--mcp"]
\`\`\`

From a source checkout, \`codechart-cli mcp\` (\`cargo run --manifest-path src-tauri/Cargo.toml --bin codechart-cli -- mcp\`) runs the same server.

## How it connects

When CodeChart Desktop opens a project it starts a loopback bridge on \`127.0.0.1\` (random port, per-instance bearer token) and registers it in \`~/.codechart/instances.json\`. The MCP server reads that file and talks to the **most recently started instance that answers its health check**. With several windows open, the last one launched wins.

## Tools (15)

Ids such as \`moduleId\` and \`path\` are repo-relative POSIX paths (e.g. \`src/app/App.tsx\`).

| Tool | Purpose | Key arguments | Needs |
|---|---|---|---|
| \`get_active_context\` | Open project, zoom level, selection, active diff id, review progress, active cohort | — | App |
| \`get_architecture_summary\` | Group tree, facades, tags, module/edge counts, diagnostics | \`groupId?\`, \`projectRoot?\` | App or headless |
| \`analyze_diff_impact\` | Foundation-first topological \`layers\`, transitive \`blastRadius\`, \`affectedGroupIds\`, \`newDiagnostics\` | \`mode?\` (loads the diff first), \`baseRef\`/\`headRef\`/\`diffText\`, \`maxDepth\` (1–8, default 3), \`projectRoot?\` | App or headless |
| \`load_diff\` | Apply a diff overlay to the canvas; returns \`diffId\` and affected module ids | \`mode\`: \`commits\` (\`baseRef\`, \`headRef\`), \`working-tree\` (\`baseRef\`), \`paste\` (\`diffText\`) | App |
| \`set_review_stack\` | Replace the Review Stack: title, markdown summary, cohorts, merge blockers. A cohort groups related changes, so one file may be split across cohorts | \`title\`, \`summary\`, \`cohorts[]\` (\`id\`, \`title\`, \`rationale\` (markdown), \`explanation\` (markdown, own frame), \`dependsOn\`, \`hunks[]\` (\`path\`, \`side\`, \`startLine\`, \`endLine\`), \`moduleIds\` (whole files)), \`blockers[]\` | Active diff |
| \`upsert_findings\` | Add or update findings by \`id\`, shown inline in Preview Frames and in the Findings tab | \`findings[]\` (\`id\`, \`path\`, \`side\`, \`startLine\`, \`endLine\`, \`severity\`, \`title\`, \`body\`, \`layerId?\`, \`blocker?\`, \`suggestedFix?\`) | Active diff |
| \`upsert_diff_notes\` | Add or update read-only markdown Diff Notes by \`id\`, rendered under their line range in L2 documents and Preview Frames | \`notes[]\` (\`id\`, \`path\`, \`side\`, \`startLine\`, \`endLine\`, \`body\`) | Active diff |
| \`clear_review_stack\` | Delete the stack, findings and agent Diff Notes for the active diff | — | Active diff |
| \`focus_layer\` | Spotlight one cohort's files, band its hunks in code, center its first file and open its explanation frame | \`cohortId\` (\`null\` clears), \`spotlight?\`: \`dim-others\` / \`highlight\` / \`off\`, \`openExplanation?\` (default \`true\`) | Stack |
| \`show_blast_radius\` | Badge downstream dependents \`SRC\` / \`R+1\` / \`R+2\` … | \`moduleId?\` (default: all changed modules), \`maxDepth?\` | App |
| \`navigate_to\` | Center a module and optionally open its Preview Frame at a line | \`path\`, \`line?\`, \`symbol?\`, \`openPreview?\` | App |
| \`get_review_state\` | Reviewed/unreviewed paths, human Review Notes, agent Diff Notes, cohorts, finding statuses | \`includeResolved?\` | App |
| \`set_files_reviewed\` | Check or uncheck diffed files as reviewed | \`paths[]\`, \`reviewed\` | Active diff |
| \`resolve_finding\` | Set a finding to \`open\`, \`resolved\`, or \`dismissed\` | \`findingId\`, \`status\` | Stack |
| \`export_review_comments\` | Format findings + Review Notes as \`markdown\`, \`github\` (PR review JSON) or \`gitlab\` (MR discussions JSON). GitLab positions carry \`base_sha\`/\`start_sha\`/\`head_sha\`, resolved with git from the diff's refs when not passed; otherwise the payload has \`missingShas: true\` + \`warning\`. Formats only — it never posts | \`format\`, \`includeResolved?\`, \`includeReviewNotes?\`, \`projectRoot?\`, \`diffId?\`, \`baseSha?\`/\`startSha?\`/\`headSha?\` (GitLab) | App or headless |

Finding severities: \`critical\`, \`major\`, \`minor\`, \`trivial\`, \`info\`. CodeChart tools never return file contents — the assistant reads source with its own file tools.

## Resources

- \`codechart://session/active\` — JSON snapshot of the active window context.
- \`codechart://review/notes\` — Review Notes, findings (including resolved) and reviewed-file progress.

## Persistence

Review Stacks, findings and agent Diff Notes are saved per diff in \`<project>/.codechart/review-stacks.json\` (keyed by \`diffId\`), so they survive restarts. **Settings → Clear review info** deletes them together with Review Notes and reviewed checkmarks.

## Headless mode

If no desktop instance answers, \`get_architecture_summary\`, \`analyze_diff_impact\` and \`export_review_comments\` analyze the project inside the MCP server process and read the \`.codechart/\` files, provided you pass \`projectRoot\` (or set \`CODECHART_PROJECT_ROOT\`). Headless \`export_review_comments\` uses the most recent stack unless you pass \`diffId\`. Every other tool needs the app.

## Environment variables

| Variable | Effect |
|---|---|
| \`CODECHART_PROJECT_ROOT\` | Default \`projectRoot\` for headless mode |
| \`CODECHART_MCP_REGISTRY\` | Alternative path to \`instances.json\` |

## Troubleshooting

| Error | Fix |
|---|---|
| \`No running CodeChart desktop instance found\` | Open CodeChart Desktop with a project, or pass \`projectRoot\` for the headless tools |
| \`No live CodeChart desktop instance responded\` | The registry is stale (app crashed). Restart CodeChart |
| \`No project loaded\` | Open a project folder in the window the server connected to |
| \`No active diff overlay in CodeChart\` | Call \`load_diff\` (or \`analyze_diff_impact\` with \`mode\`) before stack, finding or reviewed-file tools |
| Tools act on the wrong window | Close the other CodeChart windows; the newest instance is used |
| The assistant lists no CodeChart tools | Check that the configured command is the installed \`codechart.exe\` (forward slashes, quoted if it has spaces) and that \`--mcp\` is its first argument |
`;

/** The MCP topic's markdown with `<codechart.exe>` replaced by the running executable's path. */
export function withExecutablePath(markdown: string, executablePath: string | null): string {
  if (!executablePath) return markdown;
  return markdown
    .replace(UNKNOWN_PATH_NOTE, KNOWN_PATH_NOTE)
    .split(EXECUTABLE_PLACEHOLDER)
    .join(executablePath.replace(/\\/g, "/"));
}
