// @Architecture(descriptionShort="Markdown documentation content for the Wiki Links help topic")

export const WIKI_LINKS_MARKDOWN = `# Wiki Links

Wiki links allow instant navigation between files, sections, and symbols in CodeChart using clickable \`[[target]]\` syntax inside comments and markdown documentation.

## Syntax Forms

| Syntax | Description | Example |
|---|---|---|
| \`[[path]]\` | Opens the target file in a preview frame. | \`[[src/state/store.ts]]\` |
| \`[[path\\|Label]]\` | Opens the target file with custom display text. | \`[[src/state/store.ts\\|State Store]]\` |
| \`[[path#Section]]\` | Opens the target file and jumps to the specified section or heading. | \`[[docs/architecture.md#Data Model]]\` |
| \`[[#Section]]\` | Jumps to a section within the current file. | \`[[#Implementation Details]]\` |
| \`[[filename.ts]]\` | Bare filename matching via module path suffix. | \`[[store.ts]]\` |

## Contexts & Recognition Rules

- **In Source Code**: Wiki links are recognized **only inside comment tokens** (\`// ...\`, \`/* ... */\`, \`# ...\`). Literal \`[[...]]\` brackets in program logic (e.g. nested arrays) are ignored.
- **In Markdown Files**: Wiki links are recognized anywhere within the text.

## Section Anchors

When a \`#Section\` fragment is provided, CodeChart locates the target heading or marker:

- **In Markdown**: Matches ATX headings (e.g., \`# Header\`, \`## Subheader\`).
- **In Source Code**: Matches \`@Section(Name)\` annotations inside comments (e.g., \`// @Section(Validation Logic)\`).
- **Matching Rules**: Section matching is case-insensitive, and spaces and hyphens are treated as equivalent (e.g., \`#data-model\` matches \`## Data Model\`).
- If the specified section is not found, the file opens at the top without error.

## Path Resolution

- **Relative Paths**: \`./\` and \`../\` resolve relative to the directory of the file containing the link.
- **Bare Names**: A bare name like \`[[store.ts]]\` resolves to the matching module suffix in the project.
- **Project-Relative Paths**: Other paths resolve starting from the project root directory (escapes above project root are rejected).
`;
