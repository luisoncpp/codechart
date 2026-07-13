# Lessons Learned

Knowledge that helps future development: effective strategies, counter-intuitive facts, and patterns worth remembering across the codebase.

## When to Add

- When a strategy that seemed right turned out to be wrong or suboptimal.
- When something counter-intuitive was discovered through experimentation.
- When a workaround for external dependency behavior was needed and the reason isn't obvious from code.
- When a pattern proved effective and worth formalizing.

## How to Add

Create a new file in this directory named after the topic (e.g., `quill-bounds-always-relative-to-container.md`, `optimistic-ui-pattern-for-toggle-sync.md`). Then add it to the index below.

The entry should answer: **what is counter-intuitive or effective that I should know before starting similar work?**

Avoid: "bug description + fix". Prefer: "what I learned that applies to future work."

## Index

| File | Topic | Date |
|------|-------|------|
| [create-tauri-app-force-deletes-untracked-files.md](./create-tauri-app-force-deletes-untracked-files.md) | Scaffolding with `-f` can wipe untracked project files | 2026-06-19 |
| [single-parent-collapses-overlap-invariants.md](./single-parent-collapses-overlap-invariants.md) | A single `groupId`/`parentId` makes 2 of 5 graph invariants structural | 2026-06-19 |
| [tree-sitter-crate-version-pairing.md](./tree-sitter-crate-version-pairing.md) | tree-sitter runtime/grammar crate versions + 0.24 API shape for new adapters | 2026-06-19 |
| [group-body-becomes-descriptionlong-verbatim.md](./group-body-becomes-descriptionlong-verbatim.md) | `*.group.md` body → `descriptionLong` byte-for-byte; copy golden annotation text from the file (em-dash bug, fixed) | 2026-06-19 |
| [tree-sitter-error-tolerant-no-parse-error.md](./tree-sitter-error-tolerant-no-parse-error.md) | Malformed source never yields a `ParseError`; test the `parseError` path via a read failure | 2026-06-20 |
| [react-flow-jsdom-testing.md](./react-flow-jsdom-testing.md) | React Flow under jsdom: required polyfills, edges don't render, use `fireEvent` not `userEvent` | 2026-06-20 |
| [analyze-command-root-equals-path.md](./analyze-command-root-equals-path.md) | The Tauri command's `path` arg is both fs root and graph `root`; ids stay repo-relative — patch `root` to diff against golden | 2026-06-20 |
| [edge-classifiers-are-post-passes-not-in-resolve.md](./edge-classifiers-are-post-passes-not-in-resolve.md) | Drift (P8) / soft edges (P9) are separate passes over resolved edges; `resolve_references` stays pure + group-agnostic | 2026-06-20 |
| [soft-edge-detection-needs-token-plus-cross-module-match.md](./soft-edge-detection-needs-token-plus-cross-module-match.md) | Soft edges stay false-positive-free via a string-literal token + a cross-module token match — not a narrow allowlist | 2026-06-20 |
| [scroll-zoom-relayout-autofit-feedback.md](./scroll-zoom-relayout-autofit-feedback.md) | Scroll-derived detail level + re-layout + auto-fit oscillates; fit once-per-load, never per level | 2026-06-20 |
| [react-flow-edges-need-handles-on-every-endpoint.md](./react-flow-edges-need-handles-on-every-endpoint.md) | React Flow silently drops edges to a node with no `Handle` (error #008) — group nodes need handles to be L0 edge endpoints | 2026-06-21 |
| [elk-pin-disconnected-node-top-left.md](./elk-pin-disconnected-node-top-left.md) | Pin an edgeless reserved box to a group's top-left: `layerConstraint:FIRST` + `considerModelOrder` + `separateConnectedComponents=false` (the last is the non-obvious one) | 2026-06-21 |
| [tauri-ipc-detection-heuristics.md](./tauri-ipc-detection-heuristics.md) | Tauri IPC seams: tree-sitter-rust attributes are sibling statements; invoke needs `@tauri-apps/api` import + literal command name | 2026-06-24 |
| [l2-native-scrollbars-scale-with-camera-zoom.md](./l2-native-scrollbars-scale-with-camera-zoom.md) | Native scrollbars inside zoomed React Flow nodes blow up on screen; counter-scale custom thumbs (`px / zoom`) | 2026-06-22 |
| [node-border-clips-absolute-sticky-children.md](./node-border-clips-absolute-sticky-children.md) | Node borders clip sticky absolute children; offset `getBoundingClientRect()` by physical border thickness (`borderWidth * zoom`) | 2026-06-22 |
| [hide-tests-before-zoom-projection.md](./hide-tests-before-zoom-projection.md) | `filterTestModules` after L0 collapse drops every group; filter the full graph first, L0 collapse stays projection-only for layout | 2026-06-24 |
| [tauri-bundler-scans-src-bin-for-exes.md](./tauri-bundler-scans-src-bin-for-exes.md) | Never put `*.group.md` in `src-tauri/src/bin/` — Tauri bundler disk-scans it as `cli.group.exe`; use `cli/` + `exclude: bin/**` on `backend_shell` | 2026-06-29 |
| [scrollintoview-scrolls-every-ancestor-including-window.md](./scrollintoview-scrolls-every-ancestor-including-window.md) | `scrollIntoView` on an element in a positioned overlay scrolls the window too; center via manual container `scrollTop` deltas | 2026-07-05 |
| [drag-via-react-state-rerenders-whole-canvas.md](./drag-via-react-state-rerenders-whole-canvas.md) | Per-pointermove `setState` next to `<ReactFlow>` re-renders the entire canvas; drag imperatively, commit once on release, and make no-op updates return the previous reference | 2026-07-05 |
| [rust-crate-roots-are-directory-module-candidates.md](./rust-crate-roots-are-directory-module-candidates.md) | Rust directory imports may target a nested `mod.rs` or a crate-root `lib.rs`/`main.rs` | 2026-07-05 |
| [cpp-qualified-definitions-are-not-module-exports.md](./cpp-qualified-definitions-are-not-module-exports.md) | Qualified out-of-class C++ definitions belong to the class API, not the `.cpp` module export list | 2026-07-06 |
| [hidden-generated-files-still-need-import-policy.md](./hidden-generated-files-still-need-import-policy.md) | Hidden generated files can still be included by source and need matching resolver policy | 2026-07-07 |
| [cpp-preview-clickability-comes-from-scanner.md](./cpp-preview-clickability-comes-from-scanner.md) | C++ preview-frame clickability depends on definition scanning before token styling/member access | 2026-07-07 |
| [l0-layout-keeps-hidden-module-boxes.md](./l0-layout-keeps-hidden-module-boxes.md) | L0 layout still holds every hidden module box; child-box geometry must filter to visible children | 2026-07-11 |
| [counter-scaled-text-needs-scaled-geometry.md](./counter-scaled-text-needs-scaled-geometry.md) | An unscaled px cap on counter-scaled text becomes a sliver at L0; measure and render the same region; shrink-to-fit must scale the chrome too; a layout reserve for counter-scaled content needs a matching render-scale clamp | 2026-07-11 |
