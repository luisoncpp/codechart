# Flow: preview a module document or symbol definition (multi-frame)

1. **Trigger** — user chooses **Open file preview** from a module/symbol context menu, clicks an exported symbol box inside a module card at L1.5, clicks a clickable identifier inside an open preview frame, or clicks a `[[wiki-link]]` in a comment or doc (`docs/flows/open-wiki-link.md` — that path can target any project file, module or not).
2. **Entry point** — `ModuleContextMenu` (document), `ReactFlow onNodeClick` in `features/graph_canvas/Private/GraphCanvas.tsx` (symbol box inside a module node), or the frame body click handler in `preview_frames/SymbolSourceWidget.tsx` (identifier).
3. **Sequence**
   1. All preview-frame state lives in the nested deep module `features/graph_canvas/Private/preview_frames/` (`usePreviewFrames` hook; `GraphCanvas` only renders `framesView` and forwards its commands).
   2. **Context-menu document:** `openDocumentPreview` fetches the parent module source, positions the frame from the menu's cursor coordinates, and opens at the top with the preferred long/short description plus the full L2 highlighted source composition. It is available at L1 and preserves clickable identifier navigation and diff rows. While **Visualize diff** is active, a deleted module (ghost card or a live path in `deletedModuleIds`) still opens this way: the frame uses empty after-text so `DiffCodeLines` paints every row red. The menu is marked `data-preview-keep` and unmounts on a deferred tick so the activating click cannot fall through onto the canvas and dismiss the new frame.
   3. **Symbol box click:** `GraphCanvasController.onNodeClick` detects `[data-symbol-id]` on a module node click, selects that module, and invokes `openFromSymbolNode`, which closes transient open frames (a canvas click is outside all frames) while preserving pinned frames, fetches the module source (`store.fetchModuleSource`), positions the frame next to the symbol box (`computeWidgetPosition` from `.symbol-box` / `[data-symbol-id]` rect), and appends one `PreviewFrame` centered on its definition.
   4. **Identifier click inside a frame:** `DiffCodeLines` tags identifiers that match `combinedSymbolTargets(graph, moduleId, sources)` with `hl-clickable`. The clickable set is the union of (priority order on name collisions): **own-module function/method definitions** (`scanFunctionDefinitions`, heuristic line-shape scan — a locally defined name can't also be imported), **imported exported symbols** (`importedSymbolTargets` over import edges + `exportedSymbols`, first exporter wins), and **functions/methods scanned from imported modules' sources** (methods of imported classes; only resolvable once that source is in the hook's source map). Clicking one runs `openFromSymbolClick`:
      1. Resolves the name via `combinedSymbolTargets` (may target the frame's own module — e.g. a local function or method).
      2. Fetches the target module's source, and prefetches the target's import-graph sources (`sourcePrefetchIds` → `store.fetchModuleSource`, cached) so the new frame's method names resolve too.
      3. Places the new frame via `placeAdjacentFrame`: **right** of the clicked frame, else **below**, else **above** (a spot is invalid if it overlaps any live frame rect or overflows the canvas container); if all fail, opens at the **right anyway (overlapping)**. Live rects come from the DOM (`[data-frame-id]`), so user resizes/drags are honored.
      4. If a frame for the same module + symbol is already open, it is brought to front instead of duplicated (`openFrame` dedupe).
   5. Symbol frames scroll their own body to center the definition line (`findSymbolLine` — which consults `scanFunctionDefinitions` for method definitions the keyword regex misses — + manual `scrollTop`, **not** `scrollIntoView`, which would scroll the window); document frames stay at the top. `centerElementInBody` divides the measured rect delta by the body's live visual scale (`getBoundingClientRect().height / offsetHeight`), because it runs 50 ms in while the frame is still mid `widget-fade-in` `scale()` — see `docs/lessons-learned/client-rects-are-visual-pixels-scrolltop-is-layout.md`. The same helper centers find-bar matches.
   6. **Drag:** pointerdown on the header bar starts `startFrameDrag`; window-level pointermove writes `top`/`left` straight to the frame element (no React state per move — that re-rendered the whole canvas and lagged), and the final position is committed via `moveFrame` once on release; the click that trails a real drag is swallowed in capture phase so it can't close the frames.
   7. **Resize:** pointerdown on `.symbol-widget__resizer` (the bottom-right grip) starts `startFrameResize`; window-level pointermove writes `width`/`height` straight to the frame element, clamped to `MIN_FRAME_WIDTH`/`MIN_FRAME_HEIGHT`, and the final clamped size is committed **once on release** via `onResize` → `resizeFrame` — the same shape as drag's `onDrop` → `moveFrame`, and for the same reason (a state commit per pointermove re-renders the whole canvas). `PreviewFrame.width`/`height` are therefore the frame's box, not a write-once seed. The grip exists because native CSS `resize` cannot be used here: pressing a native resizer autoscrolls the frame body on a browser-internal timer for as long as the button is held — no pointer movement, nothing in the JS call stack, and nothing cancels it. `preventDefault` on the grip's press starts no native gesture, so no autoscroll exists. The grip would sit on the scrollbar's bottom button, so it is offset left by `--frame-scrollbar-width` — measured once by `scrollbar-metrics.ts` and published as an inline custom property on the frame (`0` on overlay-scrollbar platforms, where the grip keeps the true corner). Reserving the space on the body instead (`margin-bottom`, or a `border-bottom` in its own colour) shortens the scrollport, so the source clips before the frame's bottom edge — rejected twice for that reason. See `docs/lessons-learned/held-resizer-autoscrolls-the-scroller-under-it.md`.
   8. **Z-order:** pointerdown anywhere in a frame brings it to front (`bringToFront`).
   9. **Pinning and close rules:** each frame header has a pin toggle (`Pin frame` / `Unpin frame`). The pinned pin remains vivid; the unpinned hover uses reduced saturation so unpinning has visible feedback while the pointer stays over the control. A document-level click landing outside every `.symbol-widget` closes only unpinned frames; pinned frames remain open. Clicks inside any frame (including scrollbars) close nothing. Each frame's ✕ closes that frame regardless of pin state; canvas move-start (`onMoveStart`) also closes only unpinned frames; Escape on a focused frame closes it (after first closing its find bar, if open). Opening any frame arms a close grace through the next paint so the same gesture (menu click-through / move-start) cannot dismiss the frame that was just opened — important when a pinned frame already kept the outside-click listener attached.
  10. **Find in frame:** Ctrl/Cmd+F on a focused/hovered frame (or the header `⌕`) opens an in-frame find bar — see `docs/flows/find-in-preview.md`.
  11. **Copy with context:** right-click a selection in the frame body — see `docs/flows/copy-with-context.md`.
4. **Reads** — store `graph` (modules, import edges, `exportedSymbols`), source cache, diff overlay (`ghostModules`, `beforeSourceByPath`, `lineDiffByPath`), live frame DOM rects.
5. **Writes** — store `selectedId` (the parent module), `frames` + `moduleSources` state inside `usePreviewFrames`.
6. **Side effects** — lazy load file contents per opened module **and its import targets** (IPC `read_module_source`, cached by the store).
7. **Files** — `preview_frames/` (`document-preview.ts`, `preview-file-diff.ts`, `frame-drag.ts`, `frame-resize.ts`), `GraphCanvas.tsx`, `ModuleContextMenu.tsx`, `L2Content.tsx`, `DiffCodeLines.tsx`.
8. **Common failure modes** — zooming below L1.5 hides the in-module symbol boxes (the document action remains available while module nodes are visible); compact cards also hide the grid until `symbolsFitOnScreen` (the card's shorter side ≥100px on screen) — a 120×90 module stays empty until camera zoom ~1.12, while a large card paints as soon as L1.5 starts (zoom 0.9); any viewport move closes all frames; an identifier is clickable only if it resolves through import edges + `exportedSymbols` or the definition scan of an already-fetched source (soft edges don't count; imported-class methods aren't clickable until that module's source prefetch lands); the definition scan is a lexical heuristic (keyword-declared functions plus `name(args) {`-shaped lines), so an unusual formatting style can hide a definition or a rare call shape can produce a spurious clickable name — clicks on bare tokens resolve by name, first definer wins; placement falls back to overlapping-right in cramped viewports by design.

Review Note navigation opens or raises the document frame for the anchored module and centers the selected range. Document frames use the shared inline source notes.

Frame code rows **soft-wrap**: `FrameBody` passes `wrapLines` to `DiffCodeLines`/`L2CodeBlock`, which
makes `DiffCodeLine` set `white-space: pre-wrap` + `overflow-wrap: anywhere` inline, so no line
length can scroll the frame body sideways (L2 cards keep `pre`). Wrapping cannot be changed from
`graph-canvas.css` — the row's `white-space` is an inline style; see
`docs/lessons-learned/inline-white-space-outranks-the-stylesheet-wrap-rule.md`.

The **line-number cell opts out of that wrapping**: `DiffCodeLines` measures the widest row number
(`gutterDigits`, `remove` rows included) and `DiffCodeLine` reserves
`flex: 0 0 calc(<digits>ch + 4px)` with `white-space: pre`, `overflow-wrap: normal`, and no left
padding. Without all four the cell inherits `overflow-wrap: anywhere` and the UA button padding,
and breaks a multi-digit number one digit per row — see
`docs/lessons-learned/button-line-number-inherits-row-wrapping.md`. `ch` (not px) keeps the reserve
correct at every `zoom`, since the cell sets its own font-size.

`wrapLines`, `zoom`, the digit count, the class prefix, the path and `linkEveryToken` are identical
for every row, so `DiffCodeLines` builds them once as a `RowChrome` (`highlight/row-chrome.ts`) and
passes that object down through `DiffRowItem` to `DiffCodeLine`. A new document-level knob is a
field there, not a prop on each layer; anything that varies per row (tokens, wiki links, match
ranges, the active line) stays a row prop.

The default frame is 680 by 360 pixels (document preview frames opened via **Open file preview** in
the context menu use a taller default height of 720 pixels). Those numbers live **only** in
`frame-list.ts`: `frame-placement.ts` does collision and overflow math with them before any element
exists, so CSS cannot own them. `frame-box-style.ts` renders `top`/`left`/`width`/`height` inline
from the frame model and publishes `MIN_FRAME_WIDTH`/`MIN_FRAME_HEIGHT` as `--frame-min-width` /
`--frame-min-height`; `.symbol-widget` declares no size of its own and reads the floors back from
those properties.

Re-opening an already-open frame (`openFrame` dedupe → `mergeOnDedupe`) **does not** copy the
incoming `width`/`height`, exactly as it does not copy `top`/`left`: the incoming size is a creation
seed and is the same constant on every re-open, so copying it would undo the user's resize.
