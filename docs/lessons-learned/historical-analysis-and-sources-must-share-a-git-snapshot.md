# Historical analysis and source reads must share one Git snapshot

`MemoryProjectSource` already contains every blob after a historical project is
analyzed. A later IPC call that asks for a few changed source bodies must not
rebuild that source: `source_at_ref` runs both `git ls-tree` and a batched
`git cat-file`, so the apparently small read doubles full-tree Git work.

Return the analyzed graph and selected bodies from the same snapshot-loading
operation. For a two-ref comparison this keeps historical tree loads at one per
ref. On Windows, create production Git commands with `CREATE_NO_WINDOW`; piping
stdout/stderr does not by itself prevent a console window from flashing in a
GUI application.
