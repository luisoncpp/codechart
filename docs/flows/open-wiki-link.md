# Flow: open a `[[wiki-link]]` destination in a preview frame

## Trigger

Clicking a `[[target]]`, `[[target|label]]`, or `[[target#Section]]` link. Same-file fragments:
`[[#Section]]` (uses the linking file's path). Links render wherever source text or project
markdown is shown:

- inside a **preview frame** (document, symbol, or raw-markdown body),
- in an **L2 canvas module document**,
- inside a **rendered markdown** body — a preview frame showing a `.md` destination, or a group's
  `architectureDoc` panel at L2 — so docs can link to each other.

In code, links are recognized **only inside comment tokens** (a literal `[[1,2]]` in source is not
a link). In markdown files every token can hold one.

## Entry point

`SymbolSourceWidget.onCodeClick` (frame bodies) or the `onNodeClick` guard in `GraphCanvas.tsx`,
both via `wikiLinkFromEvent` (`wiki_links/`) → `usePreviewFrames` →
`createWikiLinkPreview` (`preview_frames/wiki-link-preview.ts`).

## Step-by-step sequence

1. **Render.** `DiffCodeLines` scans each rendered row with `findWikiLinks` (one bounded, linear
   regex — see the ReDoS lesson) and passes the row's spans to `TokenText`, which wraps each link
   in `<span class="hl-wiki-link" data-wiki-target data-wiki-from>`. The full target string
   (including any `#Section` fragment) is stored on `data-wiki-target`. In rendered markdown the
   same attributes come from the `marked` inline extension plus `data-wiki-from` on the
   `MarkdownBody` wrapper.
2. **Click.** `wikiLinkFromEvent` reads the target and linking file (`data-wiki-from`). On the
   canvas the guard runs **before** `GraphCanvasController`, so a link click never changes
   selection.
3. **Split.** `splitWikiTarget` splits on the **first `#`** into `pathPart` + optional `section`
   (empty after `#` → no section). Split happens **before** path resolution.
4. **Candidates.** `wikiLinkCandidates` resolves **`pathPart` only**:
   - `[[#Section]]` → `[fromPath]` (same file; no candidates if `fromPath` is missing).
   - bare name → module suffix match first; path with directory → written path first.
   - `./`/`../` resolve against the linking file's directory; root escapes return null.
5. **Read.** Close grace armed synchronously, then `store.fetchFileSource(path)` for the first
   readable candidate (`FileSourceCache`, failures cached as `null`).
6. **Section match.** When a section is present and the file read succeeded,
   `findSectionInSource(source, path, section)` scans for the first match (1-based line):
   - **Code:** `@Section(Name)` in a comment (`// @Section(Validation)`, `# @Section(Metrics window)`).
   - **Markdown:** ATX headings (`## Open project`).
   - **Matching:** case-insensitive; spaces and hyphens equivalent (`Layout pass` = `layout-pass`).
   - **Missing section:** open the file at the top — no error, no `activeRange`.
7. **Open.** `open("keep-all", …)` with `symbolName: null`. When matched, set
   `activeRange: { startLine, endLine }` (one line) for scroll/highlight — **not** `symbolName` /
   `findSymbolLine`. Markdown destinations also set `sectionAnchor` (normalized heading id) for
   prose scroll. `openFrame` dedupes on `moduleId` + `symbolName`: an already-open file is
   brought to front; `activeRange` / `sectionAnchor` merge **only when provided** on the incoming
   frame (omitting them keeps the current scroll).
8. **Body.** Code and raw-source bodies scroll/highlight the marker or heading line via
   `activeRange` (`SymbolSourceWidget` → `DiffCodeLines`). Markdown (`isMarkdown`) renders as
   prose with heading `id`s from `normalizeSectionKey`; prose scroll uses `sectionAnchor`,
   raw-source toggle uses `activeRange` on the heading line. Find disabled while prose shows.
   Unreadable destinations get `loadError`.

## Reads

`ProjectGraph.modules` (paths, labels, annotations), file source cache, live frame DOM rects.

## Writes

`frames` in `usePreviewFrames`; `GraphSessionStore` file-source cache. Selection never touched.

## Side effects

One `read_module_source` IPC per newly resolved path (cached).

## Files to inspect

| File | Why |
|------|-----|
| `wiki_links/wiki-link-parser.ts` | `[[…]]` scan + prefix match |
| `wiki_links/wiki-link-target-split.ts` | First-`#` split |
| `wiki_links/wiki-link-section.ts` | `@Section` / ATX match + key normalization |
| `wiki_links/wiki-link-target.ts` | Path resolution, suffix match |
| `wiki_links/wiki-link-candidates.ts` | Candidate ordering |
| `wiki_links/wiki-link-dom.ts` | Click → target + fromPath |
| `preview_frames/wiki-link-preview.ts` | Split → read → section → frame |
| `preview_frames/frame-list.ts` | Dedupe + merge-if-provided |
| `l2/MarkdownBody.tsx` | Heading `id`s + wiki-link extension |

## Common failure modes

- **Bare name shadowed by a module** — module suffix match wins by design.
- **Mock client never throws** on missing files (lessons-learned); use thrown `readModuleSource` to test `loadError`.
- **Find in rendered markdown** — switch to raw source (`</>`).
- **Canvas click closes unpinned frames** — grace window protects the frame being opened.
- **L2 links under jsdom** need stubbed rects (lessons-learned).
