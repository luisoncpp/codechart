# Soft-edge detection: a string-literal token AND a cross-module match keep it false-positive-free

**What applies to future work (extending soft edges — context, pub/sub, new
languages):** event emit/listen detection is heuristic (method-name allowlist),
so the noise control is *not* the allowlist — it's the two structural
requirements that gate an edge:

1. **The first argument must be a string literal.** `emit("changed")` is a
   signal; `emit(eventName)` / `dispatch(EVENTS.ready)` are not. This alone
   discards almost every accidental `send`/`on`/`publish` call (sockets, arrays,
   builders) because their first arg is rarely a bare string.
2. **The token must match across *different* modules.** A `soft` edge is only
   emitted when an emitter module and a *different* listener module share a
   token. A lone emit, a lone listen, or a same-module self-pair produces
   nothing — so a generic name like `on` only ever creates an edge when two
   files genuinely agree on an event string.

Net effect: the allowlist can stay broad (and generic) without flooding the
graph, because an edge needs *agreement between two files on a literal string*.
When adding React-context or pub/sub detection later, preserve both gates rather
than tightening the name list.

**Pipeline placement:** `classify_soft` consumes the *parsed modules*
(`signals`), not the resolved edges — it's a peer of `flag_drift`, wired in
`analysis::resolve_edges`, never folded into `resolve_references`. See
[edge-classifiers-are-post-passes-not-in-resolve](./edge-classifiers-are-post-passes-not-in-resolve.md).

**Adapter detail:** signals live anywhere (function bodies, effects), so
`signals.rs` recurses the whole tree for `call_expression` nodes — unlike imports,
which `walk_top_level` finds at the program root.
