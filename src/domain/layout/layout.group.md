---
id: layout
label: Layout Engine
color: "#0ea5e9"
icon: gear
descriptionShort: ProjectGraph → absolute boxes
architectureDoc: docs/architecture/layout.md
---

Turns a ProjectGraph into a LayoutedGraph of absolute nested boxes via elkjs. Deterministic. The LayoutEngine seam (index.ts) is the only public surface; the elk input/coords implementation is private.
