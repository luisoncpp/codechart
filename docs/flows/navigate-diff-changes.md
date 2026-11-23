# Flow: Navigate diff changes in a preview frame

## Trigger

While a diff is active, a preview frame whose file has `+`/`-` rows shows **▲ / ▼** in its header (left of `⌕`). Click them, or press **Alt+↑ / Alt+↓** with the frame focused (or, failing that, hovered).

## Entry point

`FrameHeader` `ChangeButtons` / the window keydown listener in `use-change-navigation.ts`.

## Step-by-step sequence

1. `SymbolSourceWidget` enables navigation when `hasLineChanges(fileDiff)` and the frame is not showing rendered markdown; `useChangeNavigation` then returns `{ onStep }`, else `null` (buttons hidden, no listener).
2. Shortcut: Alt+ArrowUp/Down with no Ctrl/Meta/Shift, not `defaultPrevented`; `targetFrame()` (`frame-target.ts`, shared with Ctrl+F) must be this frame → `preventDefault()`.
3. `ChangeNavigator.step` collects `.symbol-widget__line` rows in the body, reads `data-kind`, and `changeBlockStarts` returns the first row of each change block.
4. `pickChangeBlock` compares each block's first-row midpoint to the body's visible center (client rects, so open-animation scale cancels out): ▼ → first block below center, ▲ → last above, wrapping. If `scrollTop` has not changed since the last jump, it steps from the remembered index instead.
5. `centerElementInBody` writes the body `scrollTop`; the navigator remembers `{ index, scrollTop }`.

## Reads

Rendered rows of the frame body (DOM). Nothing from stores.

## Writes

Frame-body `scrollTop`; the navigator's private `last` (per frame, `useState` instance).

## Side effects

`preventDefault` on the claimed Alt+arrow press.

## Files to inspect

| File | Why |
|------|-----|
| `preview_frames/change-blocks.ts` | Pure block detection + next/prev pick |
| `preview_frames/use-change-navigation.ts` | DOM scan, centering, shortcut |
| `preview_frames/FrameHeader.tsx` | ▲▼ buttons |
| `highlight/DiffCodeLine.tsx` | `data-kind` on each row |

## Common failure modes

- Find-bar input keeps ↑/↓ for match navigation (it stops propagation), so Alt+arrows typed there never reach this listener.
- A Diff Note rendered between two changed rows does not split a block (notes are not `__line` rows).
