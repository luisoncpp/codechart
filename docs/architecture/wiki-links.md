# Wiki Links

Clickable `[[target]]` / `[[target|label]]` spans in comments and in project markdown. They open a preview frame for any project file, module or not. Clicks on the canvas are intercepted before selection, so a link never selects a node.

Path resolution: `./` and `../` against the linking file; everything else against the project root (absolute paths and root escapes rejected). A bare name tries a module path suffix match first (`[[store.ts]]` → `src/core/store.ts`).

## Syntax

Recognized only inside comment tokens in source (a literal `[[1,2]]` in code is not a link). In markdown files every token can hold one. The scan is one bounded linear regex per rendered row.

## Opening a destination

After the file is read, a `#Section` fragment is split off before path resolution. Code markers are `@Section(Name)` in comments; markdown uses ATX headings. Matching is case-insensitive, whitespace and hyphens equivalent, first in file order. Missing section still opens the file at the top.

The opener is [[wiki-link-preview.ts#Open destination]]. The matcher is [[wiki-link-section.ts#Section matching]].

Full sequence: [[docs/flows/open-wiki-link.md#Common failure modes|open-wiki-link flow]].
