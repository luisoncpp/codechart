# Diff line highlights index the after-snapshot, not the live file

`FileLineDiff.addedLineNumbers` / `removeBeforeLine` are **after-snapshot** line
coordinates (the diff's "+" side). `buildModuleDiffDisplay(source, fileDiff)`
merges them positionally over whatever `source` it is handed.

The trap: the L2 code panel and the symbol source widget both read `source`
from `GraphSessionStore.sourceCache` (the **live** file at load/fetch time), a
different origin than the git diff. The moment the working tree drifts from the
diffed "after" — e.g. the user prepends a comment then visualizes, or a
commit→commit diff whose "after" ref simply differs from the checked-out
files — every highlight shifts by the line delta. An added line renders as
context and a context line renders as added.

Fix: the overlay carries `afterSourceByPath` (already fetched for symbol diff),
and the store overrides `sourceCache` for diffed paths with that snapshot while
the overlay is active, restoring on `clearDiffOverlay`. Both panels then render
the exact text the coordinates index.

Rule for future work: if you show line-level diff decorations, the source you
decorate and the source the diff was computed against must be the **same
snapshot**. Never decorate live content with coordinates from a point-in-time
diff. (Paste mode has no snapshot, so it is inherently best-effort.)
