# Flow Docs

Operational guides organized by user or system action: "when this happens, everything that follows is this."

## Purpose

Use `docs/flows/` when you need to follow behavior end-to-end from a trigger instead of from a subsystem boundary.

This folder is for:

- debugging a concrete user action
- understanding which functions run in sequence
- finding which state is read, written, or only projected for UI
- locating side effects quickly without codebase-wide search

## How this differs from other doc types

- `docs/architecture/`
  - explains what a subsystem is, its design, and its invariants
- `docs/flows/`
  - explains what happens when an action occurs
- `docs/lessons-learned/`
  - explains counter-intuitive facts discovered while working in the area
- `docs/plan/`
  - explains how to change or refactor something

## Recommended format

Each flow doc should try to include:

1. Trigger
2. Entry point
3. Step-by-step sequence
4. Reads
5. Writes
6. Side effects
7. Files to inspect
8. Common failure modes

Keep these docs operational. Prefer short tables, explicit file names, and sequence lists over long essays.

| File | Scope |
|------|-------|
| [analyze-project.md](./analyze-project.md) | Folder → `ProjectGraph`: the full backend pipeline (parse → group → resolve → build) |
| [open-project.md](./open-project.md) | Open folder → IPC → live diagram: the UI front of the analysis pipeline (session phases) |
| [select-module.md](./select-module.md) | Click a module or group on the canvas → selection → inspection panel (pure UI state) |
| [navigate-from-inspector.md](./navigate-from-inspector.md) | Click an import in the inspector → select that module and center the canvas on it |
| [navigate-selection-history.md](./navigate-selection-history.md) | Back/forward buttons or shortcuts → move through inspector selection history |
| [resize-inspector.md](./resize-inspector.md) | Drag the inspection panel's left edge to resize; hide/show preserves width for the session |
| [reveal-in-explorer.md](./reveal-in-explorer.md) | Right-click a module/symbol → preview, open in editor, copy its path, or reveal it in the OS explorer |
| [configure-project-settings.md](./configure-project-settings.md) | Settings menu → choose the project editor or open C++ include-path configuration |
| [preview-symbol.md](./preview-symbol.md) | Click a symbol in L1.5 zoom → selection + resizable preview code widget next to it |
| [visualize-diff.md](./visualize-diff.md) | Visualize diff modal → overlay green/red modules and green/red edges on the canvas |
| [create-manage-review-note.md](./create-manage-review-note.md) | Source range to persisted Review Note and preview navigation |
| [search-project.md](./search-project.md) | Ctrl+Shift+F find bar or toolbar Search ▾ menu → full-text search of module sources → center each match |
| [go-to-file.md](./go-to-file.md) | Ctrl+P (or Search ▾ → Go to file) → same find bar in file-name mode → filter module file names locally → center each match |
| [go-to-symbol.md](./go-to-symbol.md) | Search ▾ → Go to symbol → filter exported symbol names in the analyzed graph → center each matching module |
| [find-in-preview.md](./find-in-preview.md) | Ctrl+F on a focused/hovered preview frame or header ⌕ → in-frame find bar → highlight and center matches |
| [change-metrics-timeframe.md](./change-metrics-timeframe.md) | Click the heatmap's timeframe label → choose days → recompute Git activity/risk metrics |
