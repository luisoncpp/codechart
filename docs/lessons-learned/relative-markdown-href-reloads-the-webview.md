# A relative markdown `href` reloads the whole app

Any `<a href="docs/x.md">` produced by `marked` (via `dangerouslySetInnerHTML`) is a real
navigation in the Tauri webview: clicking it loads `http://<app-origin>/docs/x.md`, which serves
the SPA again — the project state is gone and it looks like a "reload". Nothing in the React tree
sees it, so click handlers that only look for `data-wiki-target` never get a chance.

- Every `marked` instance that renders project markdown must use `markdownLinkRenderer`
  (`wiki_links/`), which turns scheme-less links into `href`-less wiki-link anchors.
- A test that asserts "ordinary links keep their `href`" is asserting the bug for in-app paths.
- Still open: instances outside the canvas (inspector `MetadataSection`, Help modal) keep plain
  `href`s, and `https:` links still navigate the webview away.

## Making the link safe is not making it work

Removing the `href` only stops the reload. Two more things decide whether a click opens anything:

- **The click must reach the anchor.** Decorative canvas text is often `pointer-events: none`
  (it is inherited by the anchor), so the click silently selects the group instead.
- **The link needs a base file.** Authors write markdown relative to the file they are editing
  (`../../docs/x.md` in a `*.group.md`). Text shown away from its file — a group description —
  must carry that file's path (`GroupNode.configPath` → `data-wiki-from`), or `../` escapes
  the project root and resolves to nothing.
