# Flow: open a `[[wiki-link]]` destination in a preview frame

## Trigger

Clicking a `[[target]]` (or `[[target|label]]`) link. Links render wherever source text or
project markdown is shown:

- inside a **preview frame** (document, symbol, or raw-markdown body),
- in an **L2 canvas module document**,
- inside a **rendered markdown** body — a preview frame showing a `.md` destination, or a group's
  `architectureDoc` panel at L2 — so docs can link to each other.

In code, links are recognized **only inside comment tokens** (a literal `[[1,2]]` in source is not
a link). In markdown files every token can hold one.

## Entry point

`SymbolSourceWidget.onCodeClick` (frame bodies) or the `onNodeClick` guard in `GraphCanvas.tsx`,
both via `wikiLinkFromEvent` (`wiki_links/wiki-link-dom.ts`) →
`usePreviewFrames` → `createWikiLinkPreview` (`preview_frames/wiki-link-preview.ts`).

## Step-by-step sequence

1. **Render.** `DiffCodeLines` scans each rendered row with `findWikiLinks` (one bounded, linear
   regex — see the ReDoS lesson) and passes the row's spans to `TokenText`, which splits the token
   text and wraps each link in `<span class="hl-wiki-link" data-wiki-target data-wiki-from>`.
   Find-match spans nest **inside** that span, so `hl-clickable` navigation keeps reading whole
   identifiers from `textContent`. `remove` diff rows carry no links (they come from the
   before-snapshot). In rendered markdown the same attributes come from a `marked` inline
   extension (`wiki-link-markdown.ts`) plus `data-wiki-from` on the `MarkdownBody` wrapper.
2. **Click.** `wikiLinkFromEvent` reads the target from the nearest `[data-wiki-target]` and the
   linking file from the nearest `[data-wiki-from]`. On the canvas the guard runs **before**
   `GraphCanvasController`, so a link click never changes selection or toggles a group.
3. **Candidates.** `wikiLinkCandidates` (pure) orders the paths the target could mean:
   a bare name tries the **module path suffix match** first (`[[store.ts]]` → `src/core/store.ts`),
   a target with a directory tries the **written path** first (`./x.ts` and `../y.md` resolve
   against the linking file's directory, everything else against the project root).
   `resolveWikiPath` returns null for absolute paths and for anything that escapes the root —
   `read_module_source` joins onto the root with no traversal guard of its own.
4. **Read.** The close grace is armed **synchronously** (a canvas click is an outside click, and
   the read below is awaited), then `store.fetchFileSource(path)` reads the first readable
   candidate through `FileSourceCache` — `readModuleSource` IPC, cached by path, failures cached
   as `null`.
5. **Open.** `open("keep-all", …)` appends a frame: `symbolName: null`, `modulePath` = the
   resolved path, `moduleId` = the module's id or (for a non-module file) the path itself, so
   `openFrame` dedupe and the clickable-symbol lookup keep working. A module destination reuses
   its label and annotation description. Placement is `placeNextToFrame` (clicked from a frame)
   or the cursor point (clicked on the canvas).
6. **Body.** A markdown destination (`isMarkdown`) renders as prose (`MarkdownBody`) with a
   header `</>` toggle to raw source; find is disabled while prose is showing because match
   ranges cannot be applied to rendered HTML. An unreadable destination opens a frame with
   `loadError` shown in a `role="alert"` line instead of a body.

## Reads

`ProjectGraph.modules` (paths, labels, annotations), the file source cache, live frame DOM rects.

## Writes

`frames` state inside `usePreviewFrames`; `GraphSessionStore`'s file-source cache. Selection is
never touched.

## Side effects

One `read_module_source` IPC call per newly resolved path (cached, failures included).

## Files to inspect

| File | Why |
|------|-----|
| `wiki_links/wiki-link-parser.ts` | The syntax: line scan + anchored prefix match |
| `wiki_links/wiki-link-target.ts` | Path resolution, root-escape guard, suffix match |
| `wiki_links/wiki-link-candidates.ts` | Which path a target means, in order |
| `wiki_links/wiki-link-dom.ts` | Reading a clicked link out of an event |
| `wiki_links/wiki-link-markdown.ts` | The `marked` inline extension |
| `highlight/TokenText.tsx` | Link + match span nesting inside a token |
| `preview_frames/wiki-link-preview.ts` | Resolution → read → frame |
| `state/graph-session/Private/file-source-cache.ts` | Arbitrary-path reads |

## Common failure modes

- **A bare name shadowed by a module.** `[[README.md]]` works because no module ends in
  `README.md`; a name that *does* match a module resolves to the module first, by design.
- **The mock analysis client never throws** — it returns `` `// <path>` `` for unknown paths and
  only serves `tests/fixtures/ts-basic-project/**/*.{ts,tsx,md}`, so "file not found" cannot be
  reproduced through it (see the lessons-learned entry).
- **Find in a rendered markdown frame.** Deliberately unavailable: switch to raw source with
  `</>` and Ctrl+F works normally.
- **Other unpinned frames close** when a link is clicked on the canvas: that click is an outside
  click for the existing frames. The frame being opened is protected by the grace window.
- **Links in L2 canvas documents do not render under jsdom** unless rects are stubbed — see
  `docs/lessons-learned/l2-documents-need-stubbed-rects-under-jsdom.md`.
