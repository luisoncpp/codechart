// @Architecture(descriptionShort="Markdown documentation content for the Architecture Tags help topic")

export const ARCHITECTURE_TAGS_MARKDOWN = `# Architecture Tags (\`@Architecture\`)

In CodeChart, source modules can define local architectural metadata directly at the top of the file using \`@Architecture(...)\` comment annotations.

## Placement & Format

- Place the tag at the **very first line** of the source file (before imports and declarations).
- Only the **first** \`@Architecture(...)\` block in the file is read.
- Use standard single-line comments (\`//\` or \`#\`) or block comments (\`/* ... */\`).

\`\`\`ts
// @Architecture(descriptionShort="Redux-like store managing state changes")
\`\`\`

## Supported Keys

| Key | Purpose | Expected Value |
|---|---|---|
| \`descriptionShort\` | Summary shown on canvas cards and in inspector. | **5–12 words** (~35–70 chars, max ~90 chars). No trailing period. |
| \`descriptionLong\` | Extended context for inspector (optional). | **1–2 sentences** (~200 chars max). |
| \`type\` | Optional role badge on node header. | \`Module\`, \`controller\`, \`util\`, \`hook\`, \`service\`, etc. |
| \`icon\` | Decorative icon on canvas card. | One of: \`cube\`, \`wrench\`, \`gear\`, \`bolt\`, \`hook\`, \`database\`, \`layers\`, \`panel\`, \`dialog\`, \`sidebar\`, \`app-window\`, \`plug\`, \`share\`, \`layout\`, \`globe\`. |
| \`group\` | Explicit group ID override. | Group identifier (prefer configuring in \`*.group.md\`). |

## Description Length Rules

- **\`descriptionShort\`** (Recommended for all modules):
  - **Length**: **5–12 words**, roughly **35–70 characters** (never exceed ~90 chars).
  - **Style**: Verb-first or concise noun phrase stating what the module does (present tense, no trailing period, no filler like "This file..." or "This module...").
- **\`descriptionLong\`** (Optional context):
  - **Length**: **1–2 sentences**, roughly **20–40 words** (max ~200 characters).
  - **Usage**: Used only when extra nuance is needed for the inspection panel. Most modules only need \`descriptionShort\`.

## Multi-Language Examples

### TypeScript / JavaScript
\`\`\`ts
// @Architecture(descriptionShort="Single choke point for network access", icon="globe")
import { ApiClient } from "./client";
\`\`\`

### Rust
\`\`\`rust
// @Architecture(descriptionShort="Pure graph builder enforcing containment invariants")
use crate::contract::ProjectGraph;
\`\`\`

### C++ / C#
\`\`\`cpp
// @Architecture(descriptionShort="Manages actor lifecycle and replication state")
#include "GameState.h"
\`\`\`

## Parsing Rules

- **Quotes**: Quote values containing commas or spaces (e.g., \`descriptionShort="Graph canvas renderer"\`).
- **Unknown Keys**: Unrecognized keys are ignored safely without causing parse errors.
- **Precedence**: Module tags take precedence for individual node labels, while \`*.group.md\` defines boundary containers.
`;
