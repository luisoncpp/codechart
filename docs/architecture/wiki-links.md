# Wiki Links

Clickable `[[target]]` / `[[target|label]]` spans in comments and in project markdown. They open a preview frame for any project file, module or not. Clicks on the canvas are intercepted before selection, so a link never selects a node.

Path resolution: `./` and `../` against the linking file; everything else against the project root (absolute paths and root escapes rejected). A bare name tries a module path suffix match first (`[[store.ts]]` → `src/core/store.ts`).

## Syntax

Recognized only inside comment tokens in source (a literal `[[1,2]]` in code is not a link). In markdown files every token can hold one. The scan is one bounded linear regex per rendered row.

In rendered markdown (group descriptions, tooltips, L2 docs, `.md` preview bodies) a plain `[label](path.md#Section)` is also a wiki link: `markdownLinkRenderer` emits the same `hl-wiki-link` anchor with **no `href`** (target URL-decoded). Never render a relative `href` — clicking it navigates the whole webview and reloads the app. Links with a URL scheme (`https:`, `mailto:`…) keep the default `marked` anchor. The in-group description sets `data-wiki-from` to `GroupNode.configPath`, so `../../docs/x.md` resolves like it does on GitHub, and it turns `pointer-events` on whenever it contains a link (otherwise it stays inert so clicks reach the group). The L1 hover tooltip is portaled outside the canvas, so links inside it are inert.

## Opening a destination

After the file is read, a `#Section` fragment is split off before path resolution. Code markers are `@Section(Name)` in comments; markdown uses ATX headings. Matching is case-insensitive, whitespace and hyphens equivalent, first in file order. Missing section still opens the file at the top.

The opener is [[wiki-link-preview.ts#Open destination]]. The matcher is [[wiki-link-section.ts#Section matching]].

Full sequence: [[docs/flows/open-wiki-link.md#Common failure modes|open-wiki-link flow]].
