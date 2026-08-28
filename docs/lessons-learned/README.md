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
| [overlay-click-is-lca-of-press-and-release.md](./overlay-click-is-lca-of-press-and-release.md) | Overlay `click` is the LCA of mousedown and mouseup; inner `stopPropagation` does not cover a drag that ends outside | 2026-08-27 |
| [cycle-witness-must-be-elementary.md](./cycle-witness-must-be-elementary.md) | Cycle messages: hub-shortest elementary witness, `(N modules)` size, `others in this cycle`, C++ paths without extensions | 2026-08-26 |
| [rust-mod-use-super-is-not-a-cycle.md](./rust-mod-use-super-is-not-a-cycle.md) | `mod` + `use super` parent/child edges are not circular includes; sibling cycles still count | 2026-08-27 |
| [flexbox-breaks-inline-markdown-flow.md](./flexbox-breaks-inline-markdown-flow.md) | Flexbox on inline markdown containers turns text nodes and inline tags into flex item columns | 2026-08-20 |
| [relaxed-diff-hunk-context-lines.md](./relaxed-diff-hunk-context-lines.md) | Treat non-change/non-marker lines in diff hunks as context to avoid line drift in LLM-generated patches | 2026-08-20 |
| [imperative-dom-mutations-break-react-reconciliation.md](./imperative-dom-mutations-break-react-reconciliation.md) | Imperative DOM child mutations inside React components cause removeChild crashes during commit phase | 2026-08-19 |
| [edge-clip-cell-hysteresis.md](./edge-clip-cell-hysteresis.md) | Clip-cell key from tight padded rect + scale in key; filter from inflated rect — cell-count w/h in the key is zoom-invariant on square viewports | 2026-08-19 |
| [static-edge-paths-no-pan-d-rewrite.md](./static-edge-paths-no-pan-d-rewrite.md) | Merged bucket paths stay static in world space — pan uses RF CSS transform, not per-frame `d` writes; clip merged `d` on cell change; arrow LOD flips via React `showArrows` only | 2026-08-19 |
| [edge-layer-needs-own-viewport-cull.md](./edge-layer-needs-own-viewport-cull.md) | `onlyRenderVisibleElements` does not cull a custom SVG edge layer — merge bucket paths, drop `marker-end`, static world-space `d`, arrow LOD on zoom threshold only | 2026-08-19 |
| [l15-font-floor-empties-symbol-bands.md](./l15-font-floor-empties-symbol-bands.md) | A 12px-label floor hid every L1.5 grid until zoom 1.33 — card-size LOD only; don't outpace text already on the card | 2026-08-26 |
| [l15-symbol-grid-screen-lod.md](./l15-symbol-grid-screen-lod.md) | L1.5 symbol grids need per-card screen LOD — in-module paint alone still mounts thousands of unreadable 9px labels at zoom 0.9 | 2026-08-19 |
| [l15-symbols-in-module-not-rf-nodes.md](./l15-symbols-in-module-not-rf-nodes.md) | L1.5 exported symbols must paint inside module cards — nested RF symbol nodes defeat `onlyRenderVisibleElements` module-grain culling | 2026-08-19 |
| [yaml-hash-comments-out-group-frontmatter.md](./yaml-hash-comments-out-group-frontmatter.md) | Unquoted `#` in `*.group.md` YAML is a comment — a `[[path#Section]]` in `descriptionShort` can drop the whole nested group from the canvas | 2026-08-18 |
| [mock-analysis-client-never-throws-on-missing-files.md](./mock-analysis-client-never-throws-on-missing-files.md) | The mock client returns `// <path>` instead of failing, so every "unreadable file" branch is dead in dev/tests and any fallback chain that keys on a read failure never advances — order candidates by intent, and test failure paths with a throwing stub client | 2026-08-17 |
| [l2-documents-need-stubbed-rects-under-jsdom.md](./l2-documents-need-stubbed-rects-under-jsdom.md) | `inFov` from `useL2ClampedLayout` is false under jsdom (all rects are 0×0), so L2 module documents and group doc panels mount nothing; stub `getBoundingClientRect` per test, never in the shared setup | 2026-08-17 |
| [one-regex-for-two-import-forms-is-a-redos.md](./one-regex-for-two-import-forms-is-a-redos.md) | Matching both `import {a} from "x"` and bare `import "x"` with one pattern needs a repeated clause group, and that group backtracks exponentially on every `export`/`import` line that ISN'T an import — cost ×4 per 2 characters of declaration name, run once per diff line, so "Visualize diff" took minutes. Split into one linear pattern per form; a vitest `timeout` cannot catch it (the stall is synchronous), so assert elapsed time | 2026-08-15 |
| [sync-tauri-commands-run-on-the-main-thread.md](./sync-tauri-commands-run-on-the-main-thread.md) | `#[tauri::command]` defaults to `ExecutionContext::Blocking` — the body runs inline on the main thread, so the window stops painting AND a frontend `Promise.all` over two commands silently queues them instead of overlapping. `(async)` on the same sync body fixes both; the repo rule is now "async unless it returns something already in memory" | 2026-08-15 |
| [live-canvas-overlays-should-not-relayout-history.md](./live-canvas-overlays-should-not-relayout-history.md) | A second ELK of the before graph does not fit the live canvas; local-changes ghosts should use current boxes, not a historical layout | 2026-08-14 |
| [working-tree-untracked-adds-need-rename-fallback.md](./working-tree-untracked-adds-need-rename-fallback.md) | `git diff -M` never sees untracked adds appended after the tracked diff, so local-change renames need a fingerprint fallback | 2026-08-14 |
| [deleted-files-in-diff-need-group-inference-and-synthetic-layout.md](./deleted-files-in-diff-need-group-inference-and-synthetic-layout.md) | Pasted diffs lack historical Git trees; infer owning group from directory/siblings and lay out a synthetic before-graph so deleted files get coordinates and red borders | 2026-08-13 |
| [folder-inference-needs-path-prefixes.md](./folder-inference-needs-path-prefixes.md) | Folder inference must expand parent paths to every prefix, not only dirs with direct files | 2026-08-10 |
| [pinned-frames-keep-close-listener-armed.md](./pinned-frames-keep-close-listener-armed.md) | A pinned preview keeps the outside-click listener attached, so reopen needs an open-gesture grace (menu fall-through / move-start) | 2026-08-05 |
| [parent-relative-group-paths.md](./parent-relative-group-paths.md) | `..` works in group paths, so a nested group can own a sibling facade without regex | 2026-07-30 |
| [per-line-tokenizing-drops-multi-line-syntax.md](./per-line-tokenizing-drops-multi-line-syntax.md) | A stateless lexer called per diff row cannot see a later `*/`; test the tokenizer at the renderer's granularity | 2026-07-26 |
| [client-rects-are-visual-pixels-scrolltop-is-layout.md](./client-rects-are-visual-pixels-scrolltop-is-layout.md) | An open animation's `scale()` makes client rects disagree with `scrollTop`; the centering error grows with distance to the target | 2026-07-26 |
| [l0-collapses-ancestors-so-per-group-expand-needs-the-chain.md](./l0-collapses-ancestors-so-per-group-expand-needs-the-chain.md) | L0 collapses every ancestor too, so expanding one group must walk the chain; layout reduction ≠ display reduction | 2026-07-26 |
| [tauri-opener-default-excludes-open-path.md](./tauri-opener-default-excludes-open-path.md) | `openPath` needs both command permission and a matching path/application scope; surface launch failures | 2026-07-24 |
| [cpp-bare-quoted-includes-may-be-external.md](./cpp-bare-quoted-includes-may-be-external.md) | Preserve bare quoted C++ includes so dependency headers outside the analysis root do not become false unresolved diagnostics | 2026-07-22 |
| [historical-analysis-and-sources-must-share-a-git-snapshot.md](./historical-analysis-and-sources-must-share-a-git-snapshot.md) | An analyzed Git tree already contains every source; reuse it for changed bodies, and hide child consoles on Windows | 2026-07-20 |
| [unreal-generated-body-can-swallow-later-declarations.md](./unreal-generated-body-can-swallow-later-declarations.md) | Mask `GENERATED_*_BODY()` tokens so tree-sitter does not absorb later Unreal types into one struct | 2026-07-22 |
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
| [local-draft-state-avoids-canvas-rerenders.md](./local-draft-state-avoids-canvas-rerenders.md) | Keep high-frequency draft input out of global stores that re-render the React Flow canvas | 2026-07-14 |
| [navigation-requests-must-be-consumed.md](./navigation-requests-must-be-consumed.md) | Retained UI commands replay when unrelated dependencies recreate an effect callback | 2026-07-14 |
| [programmatic-canvas-moves-trigger-move-handlers.md](./programmatic-canvas-moves-trigger-move-handlers.md) | React Flow camera commands trigger move handlers and can undo the navigation UI that caused them | 2026-07-14 |
| [stable-store-identity-does-not-invalidate-memos.md](./stable-store-identity-does-not-invalidate-memos.md) | External-store rerenders do not invalidate memos that depend only on the stable store object | 2026-07-16 |
| [diff-line-highlights-index-after-snapshot.md](./diff-line-highlights-index-after-snapshot.md) | Line-diff coordinates index the after-snapshot; decorate that snapshot, not the live `sourceCache` file, or highlights shift | 2026-07-19 |
| [react-flow-culling-is-inert-under-jsdom.md](./react-flow-culling-is-inert-under-jsdom.md) | `onlyRenderVisibleElements` force-renders unmeasured nodes; jsdom's no-op ResizeObserver means everything still renders — assert the prop, not the culling | 2026-07-19 |
| [crlf-bodies-break-newline-splitting.md](./crlf-bodies-break-newline-splitting.md) | Windows CRLF group files defeat `"\n\n"` paragraph splits (whole body becomes `descriptionShort`); normalize `\r\n` first, and compare prose whitespace-normalized, not byte-equal | 2026-07-20 |
| [ts-rs-export-dir-is-configured-twice.md](./ts-rs-export-dir-is-configured-twice.md) | `src/domain/graph/model` is ts-rs output; `TS_RS_EXPORT_DIR` lives in both `.cargo/config.toml` and the `check` script — update both when moving it | 2026-07-20 |
