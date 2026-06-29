# Flow: resize the inspection panel

1. **Trigger** — user drags the left edge of the visible inspection panel (or hides/shows it).
2. **Entry point** — `PanelResizeHandle.onPointerDown` (`features/inspection_panel/Private/PanelResizeHandle.tsx`); hide/show via `App` (`inspectorOpen` state).
3. **Sequence (resize)**
   1. Pointer capture on the separator handle; track `startX` + `startWidth` from `useInspectorLayout()`.
   2. Each `pointermove` → `setWidth(clamp(startWidth + startX - clientX, 200, 720))`.
   3. `pointerup` / `pointercancel` → release capture and remove listeners.
   4. `PanelChrome` reads `width` from context and applies it to the `<aside>` (`flexShrink: 0`).
4. **Sequence (hide/show)**
   1. Hide chevron in `PanelChrome` → `App.setInspectorOpen(false)` — panel unmounts, `inspectorWidth` stays in `App` state.
   2. `◀` tab → `setInspectorOpen(true)` — panel remounts at the saved width.
5. **Reads** — `App` `inspectorWidth`; store `graph` / `selectedId` (panel content only).
6. **Writes** — `App` `inspectorWidth` (resize) or `inspectorOpen` (collapse); no store or IPC writes.
7. **Side effects** — none.
8. **Files** — `App.tsx`, `InspectionPanel.tsx`, `InspectorLayoutContext.tsx`, `PanelResizeHandle.tsx`, `PanelParts.tsx`.
9. **Common failure modes** — width does not persist across app restarts (session-only state; no `localStorage`).
