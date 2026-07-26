# Expand / collapse a group

## Trigger

Click a group's upper-left chevron (`data-group-toggle`), double-click a group box, or a store call
(`focusOn`, `expandGroup`, `collapseGroup`). At L0 every group starts collapsed.

## Entry point

`GraphCanvas` → `onNodeClick` / `onNodeDoubleClick` → `GraphCanvasController` →
`GraphCanvasNodeHandlers.clickGroup` (`Private/controller/graph-canvas-node-handlers.ts`).

## Sequence

| # | Step | File |
|---|------|------|
| 1 | Click target inspected — `closest("[data-group-toggle]")` wins over selection | `graph-canvas-node-handlers.ts` |
| 2 | `store.toggleGroup(id)` flips the per-group override in `collapsedGroupIds` | `graph-session-store.ts` |
| 3 | On **expand**, `expandCollapsedGroupAncestors` also clears the ancestor chain | `ensure-node-visible.ts` |
| 4 | `syncReduced()` → `reduceForView` (test filter → `projectForZoom` → disconnect filter) | `graph-session-store.ts` |
| 5 | `emit("zoom-changed")` → `useGraphSession` re-render | `use-graph-session.ts` |
| 6 | `recomputeLayout()` lays out `reduceForLayout` (full graph at L0), republishes `reduceForView` | `graph-session-store.ts` |
| 7 | `projectGraph` drops modules/symbols whose group chain is still collapsed (`isModuleExpanded`) | `rf-projection.ts` |
| 8 | `GroupNodeView` renders `CollapsedCard` or `ExpandedHeader` from `data.collapsed` | `GroupNodeView.tsx` |

## Reads / Writes

- Reads: `graph`, `collapsedGroupIds`, `zoomLevel`, `hideTests`, `disconnected*Ids`, `expandedGroupSizes`.
- Writes: `collapsedGroupIds`, `reduced`, `layout`.
- Side effects: async ELK re-layout (seq-guarded); no IPC.

## Common failure modes

- **"Only the font changed"** — the group expanded but an ancestor is still collapsed, so no contents
  render. Step 3 is what prevents this; see the L0-ancestors lesson.
- **L0 edges vanish or duplicate** — step 6 published the layout graph instead of `reduceForView`,
  losing `projectForZoom`'s group→group aggregation.
- **Collapsed box shrinks** — `expandedGroupSizes` never captured (`captureExpandedSizes` only trusts a
  fully-expanded layout).
- **Click selects instead of toggling** — the `data-group-toggle` attribute was dropped from the button.
