# Flow: Find in a preview frame

## Trigger

Ctrl/Cmd+F while a preview frame is focused (or, failing that, hovered), or clicking the `⌕` icon in a frame's header. A frame opened while project search has a query auto-opens pre-filled with it (`PreviewFrame.initialFindQuery`, read from `CanvasUiState.getFindQuery` at open time; the frame input is not focused).

## Entry point

`use-frame-search.ts` (window keydown listener per mounted frame) / the header button in `SymbolSourceWidget.tsx`.

## Step-by-step sequence

1. `useOpenShortcut` sees ctrl/meta+F (no shift/alt). Target frame = `document.activeElement?.closest(".symbol-widget")`, else `document.querySelector(".symbol-widget:hover")`. If the target is this frame → `preventDefault()`, open the bar, focus+select the input. If no frame claims it, the event falls through to the browser (project search keeps Ctrl+**Shift**+F).
2. Typing updates component-local `query`; `findFrameMatches` (`frame-search.ts`, pure, synchronous — no debounce/IPC) collects case-insensitive non-overlapping matches: description first (document frames only), then code in line/col order. Active index resets to 0.
3. `codeMatchesByLine` / `descriptionRanges` flag the active match; `DiffCodeLines` (via `matchesByLine`) and `L2Description` (via `matchRanges`) render `hl-match` / `hl-match--active` spans **nested inside** token spans (`segmentTokenText`, `Private/match-highlight.ts`).
4. Enter / Shift+Enter / ↑↓ buttons call `navigate(delta)` → shared `Private/match-stepper.ts` `stepIndex` (wrap-around).
5. An effect centers `activeMatchRef` via `centerElementInBody` (`center-in-body.ts`, body-`scrollTop` only — never `scrollIntoView`).
6. Escape in the input closes the bar (refocuses the frame); Escape on the frame root with the bar closed closes the frame.

## Reads

Frame's `sourceText` and (document frames) `frame.description`. Nothing from stores.

## Writes

None outside the widget: `barOpen`/`query`/`activeIndex` are local state in `useFrameSearch`. `usePreviewFrames`, `GraphSessionStore`, and the frame list are untouched.

## Side effects

`preventDefault` on the claimed Ctrl+F; frame-body `scrollTop` writes; focus moves (always `focus({ preventScroll: true })`).

## Files to inspect

| File | Why |
|------|-----|
| `preview_frames/use-frame-search.ts` | State, Ctrl+F targeting, centering effect |
| `preview_frames/frame-search.ts` | Pure matching + grouping + counter |
| `preview_frames/FrameFindBar.tsx` | Bar UI; consumed keys stop propagation |
| `preview_frames/FrameBody.tsx` | Threads match props into code/document content |
| `Private/match-highlight.ts` | `segmentTokenText` token splitting |
| `Private/DiffCodeLines.tsx` | Nested `hl-match` span rendering |
| `Private/L2Content.tsx` | Description highlighting |
| `preview_frames/center-in-body.ts` | Centering without window scroll |

## Common failure modes

- Hover targeting needs a real pointer (`:hover`); in jsdom only the focused path works.
- Matches are computed over the live source, so `remove` diff rows (which have no after-snapshot line number) never highlight — by design.
- Sibling-splitting the token spans (instead of nesting) breaks `hl-clickable` navigation, which reads the token span's `textContent`.
