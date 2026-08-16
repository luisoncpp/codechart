# Historical analysis and source reads must share one Git snapshot

`MemoryProjectSource` already contains every blob worth reading after a historical
project is analyzed. A later IPC call that asks for a few changed source bodies must not
rebuild that source: `source_at_ref` runs both `git ls-tree` and a batched
`git cat-file`, so the apparently small read doubles full-tree Git work.

(Since then, `source_at_ref` takes a `wanted` predicate and only reads the blobs
analysis actually opens — `analysis::opens_file`. Every path is still *listed*, because
the unreal/unity sniffing and the ignore rules read the file list; only content is
skipped. The changed bodies a diff needs are module paths, so they are always in the
readable half.)

Return the analyzed graph and selected bodies from the same snapshot-loading
operation. For a two-ref comparison this keeps historical tree loads at one per
ref. On Windows, create production Git commands with `CREATE_NO_WINDOW`; piping
stdout/stderr does not by itself prevent a console window from flashing in a
GUI application.
