# Edge classifiers are post-passes over resolved edges, not part of `resolve_references`

**What applies to future work (esp. Phase 9 soft edges):** keep
`references::resolve_references` doing *only* pure import resolution (specifier →
edge / unresolved diagnostic). It takes parsed modules and nothing else — no
group context. Edge *classification* that needs more context (Phase 8 facade-bypass
drift; Phase 9 event/context/pub-sub soft edges) lands as a **separate pass** that
mutates the already-resolved edges.

Why this shape:

- The 10 `resolve_references` unit tests stay group-agnostic and untouched when a
  new classifier ships — drift was added with **zero** edits to them.
- `references` owns its own input type for the extra context (`GroupBoundaries`),
  and `analysis::group_boundaries` adapts `grouping::ResolvedGroups` → it. So
  `references` never imports `grouping`'s data model; the pipeline coupling lives
  in `analysis`, the one module allowed to know both.
- `analysis` composes it in a small private helper (`resolve_edges`) so
  `analyze_project` stays under the 30-line guideline.

Phase 9 should follow the same pattern: a `classify_soft(&mut edges, …)` pass, its
own input type, wired in `analysis` alongside `flag_drift` — not folded into
`resolve_references`.
