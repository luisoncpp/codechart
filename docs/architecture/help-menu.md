# Help Menu

The `help_menu` feature provides the toolbar **Help** dropdown menu and documentation modals for core CodeChart concepts: **Groups format**, **Architecture tags**, **Diff notes**, **Wiki links**, **MCP server**, and **Code review skill / prompt**.

## Responsibility

- Present accessible documentation explaining CodeChart's architectural configuration, `@Architecture` semantic comments, diff note annotations, and wiki link syntax.
- Render documentation as formatted Markdown in a scrollable modal dialog.
- Provide a one-click **Copy as Markdown** action that writes raw Markdown to the clipboard for feeding into LLM prompts or external documentation.

## Components & Data Flow

- `HelpMenu` (`Private/HelpMenu.tsx`): Renders the `DropdownMenu` trigger and action items for each topic, and manages the active topic state.
- `HelpModal` (`Private/HelpModal.tsx`): Overlay dialog (`role="dialog"`, `aria-modal="true"`) with topic title, copy buttons, close buttons, and escape key listener.
- `HelpMarkdownView` (`Private/HelpMarkdownView.tsx`): Uses a private `Marked` instance to render topic markdown into styled HTML elements. A leading YAML frontmatter block is displayed as a ```` ```yaml ```` code block (marked would otherwise render `<hr>` + a setext heading).
- `help-docs.ts` (`Private/help-docs.ts`): Topic metadata and canonical Markdown content for:
  - `groups-format`: `*.group.md` YAML frontmatter, membership, description length guidelines (`descriptionShort` vs `descriptionLong`), sibling facades, group layering (`mustNotImport` / `mayImport`), and nested claims vs forbidden partial overlap.
  - `architecture-tags`: `@Architecture(...)` comment annotations on the first line of source files, supported keys (`descriptionShort`, `descriptionLong`, `type`, `icon`, `group`), length rules, and multi-language examples.
  - `diff-notes`: `#` column-0 markers in pasted diffs, before/after target binding, and review preservation.
  - `wiki-links`: `[[path#Section|label]]` syntax, comment token parsing, and `@Section`/ATX anchors.
  - `mcp-server`: requirements (installed app only), registration of `codechart.exe --mcp` for Claude Code / JSON configs / Codex TOML, instance discovery, 15-tool table with key arguments and preconditions, resources, persistence, headless fallback, env vars, troubleshooting.
  - `code-review-prompt`: a ready-to-save `SKILL.md` (frontmatter `name`/`description`) for dependency-ordered Review Stack reviews over the MCP tools. Its human-only usage note lives in the topic's `intro`.

## Invariants

- Topic documentation is embedded in the application bundle and available without a loaded project or backend connection.
- Modals are dismissed via backdrop click, Escape key, or Close buttons without side effects on project state.
- Copy action uses `navigator.clipboard.writeText` with transient visual feedback ("✓ Copied!").
- Copy writes `topic.markdown` only; the optional `topic.intro` is rendered above it but never copied, so copied skills/prompts contain no human-facing instructions.
- The MCP help tables mirror `src-tauri/src/mcp_server/tool_*.rs`; update both when a tool's name, arguments or preconditions change.
- The MCP snippets use a `<codechart.exe>` placeholder. `HelpMenu` asks its `getExecutablePath` prop (`StartupClient.getExecutablePath` → Tauri `get_executable_path`) and `withExecutablePath` fills in the running executable's path (forward slashes) before the modal opens, so the copied Markdown is ready to paste. A null path keeps the placeholder and its replace-me note.
