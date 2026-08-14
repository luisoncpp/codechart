# Deleted files in diffs need group inference and synthetic layout

**Context:** The diff visualizer overlays unified diffs (git commits or pasted text) on the architecture diagram. Unchanged modules dim, added/modified modules get green borders, and deleted files must render as ghost module cards with red borders (`3px solid #dc2626`).

**Problem:** In pasted diffs (and any diff where the deleted file is no longer in the loaded project graph), `beforeLayout` was `null` and deleted files were dropped from the canvas. Furthermore, git diff headers like `deleted file mode 100644` without `---` / `+++` lines (binary files or empty files) were not classified as deleted.

**What we learned:**
1. **Group Inference:** Even when a deleted file does not exist in `ProjectGraph.modules`, its path (`src/ui/components/HUD/inventory/views/LobbyView.tsx`) shares directories with existing sibling modules (`src/ui/components/HUD/inventory/...`) or matches group IDs in `ProjectGraph.groups`. Walking the path prefixes from longest to shortest reliably infers the owning `groupId`.
2. **Synthetic Layout for Paste Mode:** Creating a synthetic before-graph (`{ ...graph, modules: [...graph.modules, ...ghostModules] }`) and running `layoutEngine.layout()` gives deleted files proper layout boxes and coordinates inside their groups alongside surviving modules.
3. **Resilient Ghost Node Stamping:** In `applyDiffOverlay`, ghost module nodes should never be dropped when `beforeLayout` is missing or when a parent group was deleted/omitted from the projected canvas. Checking if `mod.groupId` exists in the projected group nodes avoids setting orphaned `parentId` attributes in React Flow while falling back to absolute positioning.
4. **Greedy Collision Avoidance for Ghost Placement:** When deleted files lack layout boxes (e.g. pasted diffs), falling back to `(0, 0)` stacks them on top of each other and overlaps group headers. A greedy placement generator evaluates candidate positions inside container bounds, penalizing overlaps with diff/affected modules at the highest weight (`1,000,000`), structural group obstacles at high weight (`100,000`), and unchanged baseline modules at lower weight (`1,000`). Each placed ghost module is dynamically added as a diff obstacle so subsequent ghosts find free adjacent slots.

