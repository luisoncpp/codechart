---
id: inspection_panel
label: Inspection Panel
color: "#0d9488"
icon: sidebar
descriptionShort: Selected module or group detail view
---

Side panel showing details for the currently selected module or group. Reads selection state; renders no graph. Collapsible (hide chevron / `◀` show tab in `App`); left-edge drag resizes width (200–720px, default 280px). Width state lives in `App`; `InspectorLayoutProvider` threads it to `PanelChrome` / `PanelResizeHandle`. Only the facade (`index.ts`) is public.
