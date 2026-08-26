# Flow: copy a preview-frame selection with file context

## Trigger

Select text in a preview frame body, then right-click.

## Entry point

`SymbolSourceWidget` `onContextMenu` on `.symbol-widget__body` → `useFrameCopyMenu` / `captureCopyMenu`.

## Step-by-step sequence

1. The frame body calls `preventDefault` so the browser native context menu does not appear. The live `window.getSelection()` snippet and its 1-based line range (from `[data-line]` ancestors on `DiffCodeLine` rows) are snapshotted before the click dismisses the selection.
2. A portaled menu (`FrameContextMenu`, `data-preview-keep`) opens at the cursor with **Copy** and **Copy with context**.
3. **Copy** writes the selected snippet via `navigator.clipboard.writeText`.
4. **Copy with context** writes a markdown fence ` ```start:end:path ` plus that snippet (`formatCopyWithContext`). A single-line selection still uses `start:end` (e.g. `12:12`). If the snippet itself contains backticks, the fence is lengthened until it no longer collides.
5. Empty selection: both items disabled. Selection not on source rows (rendered markdown, module description, error body): **Copy** stays available, **Copy with context** is disabled.
6. Escape closes the copy menu first, then the find bar, then the frame. Clicking the backdrop closes only the menu (the frame stays, including unpinned frames). Ctrl/Cmd+C is unchanged.

## Reads

The DOM selection and `[data-line]` on the frame's code rows. Frame `modulePath`. No stores.

## Writes

System clipboard. No graph or preview-frame list state.

## Side effects

`preventDefault` on the body's `contextmenu`; clipboard write.

## Files to inspect

| File | Why |
|------|-----|
| `preview_frames/copy-with-context.ts` | Fence formatting + which menu action is available |
| `preview_frames/selection-line-range.ts` | Selection → inclusive line range |
| `preview_frames/use-frame-copy-menu.ts` | Snapshot on right-click |
| `preview_frames/FrameContextMenu.tsx` | Menu UI + clipboard write |
| `preview_frames/SymbolSourceWidget.tsx` | Body `contextmenu`, Escape order |
| `highlight/DiffCodeLine.tsx` | `data-line` on each source row |

## Common failure modes

- Rendered markdown and description text have no `data-line`, so **Copy with context** stays disabled until the reader switches to raw source (markdown) or selects code.
- Removed-diff rows still carry `data-line` (before-snapshot numbers).
- The menu is portaled to `document.body` so `.symbol-widget { overflow: hidden }` cannot clip it; it must keep `data-preview-keep` or an unpinned frame closes when a menu item is clicked.
