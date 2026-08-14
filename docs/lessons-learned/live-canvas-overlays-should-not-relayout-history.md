# Live-canvas overlays should not re-layout history

**Context:** Local-changes diff visualization already has a laid-out live graph. Deleted files still need ghost cards on that canvas.

**What we learned:** A fresh `LayoutEngine.layout(before)` is a second full ELK pass (main-thread `elk.bundled.js`, including every exported-symbol child). Its coordinates live in a different space from the on-screen layout, so `placeGhostModules` cannot take the score-0 fast path and still has to search the live boxes. Ghost module data and removed edges already come from the before `ProjectGraph`; inspection does not need `beforeLayout`. Keep the extra layout for commit-to-commit (no live canvas to seed from, and L1.5 removed-symbol ghosts need historical boxes). For overlays onto the current map, skip it.
