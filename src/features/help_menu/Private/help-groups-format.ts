// @Architecture(descriptionShort="Markdown documentation content for the Groups Format help topic")

export const GROUPS_FORMAT_MARKDOWN = `# Groups Format (\`*.group.md\`)

In CodeChart, architectural boundaries, hierarchies, and module groupings are defined using \`*.group.md\` files located in project directories.

## File Format

Each group file consists of optional **YAML frontmatter** followed by a **Markdown body** (\`descriptionLong\`):

\`\`\`markdown
---
id: ui_components
label: UI Components
color: "#3b82f6"
icon: layout
facades:
  - index.ts
mustNotImport:
  - db
mayImport:
  - domain
  - shared
match:
  - "**/*.tsx"
  - "!**/*.test.tsx"
descriptionShort: "Reusable UI primitives and component library"
---

# UI Components

Long-form architectural description of this group, explaining responsibilities,
design patterns, and subsystem boundaries.
\`\`\`

## Frontmatter Configuration

| Field | Type | Description |
|---|---|---|
| \`id\` | string | Unique group identifier (defaults to folder path or filename). |
| \`label\` | string | Display name on the canvas and in menus. |
| \`color\` | string | Hex color used for node borders, headers, and accents. |
| \`icon\` | string | Optional icon name. |
| \`facades\` | string[] | Entrypoint modules (defaults to \`index.ts\` / \`index.tsx\` if present). |
| \`mustNotImport\` | string[] | Group ids this group's module tree must not import (denylist). |
| \`mayImport\` | string[] | When present, only these group ids may be imported (plus this group's own subtree). |
| \`match\` | string[] | Glob patterns or \`/regex/\` claiming modules (relative to group directory). |
| \`files\` | string[] | Explicit list of file paths belonging to this group. |
| \`groups\` | string[] | Child group IDs for composition groups (parent-child nesting). |
| \`exclude\` | string[] | Exclusion globs subtracted from the group's claims. |
| \`disconnected\` | boolean | If \`true\`, hides all connections to/from this group by default. |
| \`disconnectedModules\` | string[] | Relative module paths whose connections are hidden by default. |
| \`architectureDoc\` | string | Repo-relative path to extended markdown doc displayed at L2 zoom. |
| \`descriptionShort\` | string | Summary text for tooltips and cards (defaults to 1st paragraph of body). |
| \`ignore\` | string[] | Root-only glob patterns ignored during project analysis. |

## Expected Description Lengths

- **\`descriptionShort\`** (frontmatter):
  - **Length**: **5–12 words**, roughly **35–70 characters** (never exceed ~90 chars).
  - **Style**: Verb-first or noun phrase stating what it does (no trailing period, no filler like "This module..."). Rendered on compact canvas cards.
- **\`descriptionLong\`** (markdown body):
  - **Length**: **2–4 sentences**, roughly **40–120 words**.
  - **Content**: Plain prose covering (1) responsibility, (2) public surface/facade, (3) private internals, and (4) cross-cutting interactions.

## Membership Claims & Overlap Rules

- **Nested Groups vs Partial Overlap**: Multiple groups can claim the same file **only when they are nested** (a nested explicit child group supersedes an ancestor's folder ownership; the innermost group wins). **Partial overlap** between competing, non-nested explicit groups is forbidden and produces \`configError:overlap:<module>\`. Cross-cutting claims require the folder owner to cede files via \`exclude\`.
- **Folder Ownership**: A group without \`match\`, \`files\`, or \`groups\` automatically claims all files in its directory.
- **Sibling Facades**: A group in \`domain/widget/\` can own \`domain/widget.ts\` using \`match: ["../widget.ts", "**"]\` and \`facades: ["../widget.ts"]\`.
- **Layering**: \`mustNotImport\` / \`mayImport\` constrain outbound solid imports between groups. They are independent of facades — importing a public facade can still be a violation. Nested groups inherit a parent's rule; named targets include their descendants. Sibling rules belong on those groups, not on a composition parent. Unknown ids are \`configError\`s.
- **YAML Escaping**: Always quote string values containing \`#\` (e.g. \`descriptionShort: "See [[#Section]]"\`) to avoid YAML comment syntax.
`;
