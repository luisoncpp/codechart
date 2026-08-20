# L1.5 symbols must paint inside module cards, not as React Flow nodes

At L1.5 (`showSymbols`), each exported symbol used to be its own React Flow child node under the parent module. That meant `onlyRenderVisibleElements` could only cull at symbol granularity when the parent module was on screen — every symbol inside a visible module stayed mounted, so a symbol-heavy project still paid a large per-frame composite cost while panning.

**Fix:** projection attaches `data.symbols` geometry to each module node; `ModuleNodeView` paints absolutely positioned `.symbol-box` elements inside the card. The React Flow `nodes` array holds only `group` and `module` entries, so viewport culling works at module grain.

Preserve click targeting with `data-symbol-id` / `data-id` on the inner box; handlers detect `[data-symbol-id]` on module clicks and open previews from the box rect.
