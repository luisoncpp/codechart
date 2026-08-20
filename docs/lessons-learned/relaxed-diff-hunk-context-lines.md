# Relaxed Diff Hunk Context Lines

Diff parsers consuming unified diffs from external tools or LLM pastes must treat any non-change, non-marker line inside an active hunk as context rather than requiring a strict `' '` prefix.

## Context

Standard unified diff format requires context lines to have a single leading space (`' '`), removed lines to start with `'-'`, and added lines to start with `'+'`. However, pasted diffs and LLM-generated patches frequently emit blank lines as empty strings (`""`), use tab indentation without a space prefix, or omit the leading space on comment lines.

## The Pitfall

A parser that strictly branches on `prefix === " "` will silently skip unprefixed or empty lines without incrementing old/new line counters (`oldLine++`, `newLine++`). Every skipped context line causes a -1 offset for all subsequent additions, removals, and `#` Diff Notes in that hunk. As a result:

1. Modifying lines are attached to previous context rows, turning unrelated comments/code into green `+` rows.
2. Removed `-` rows render above the wrong code lines.
3. Diff Notes bind to lines above where they were placed.

## Rule

Inside an active hunk:
- `+` advances `newLine`.
- `-` advances `oldLine`.
- `#` and `\` are ignored.
- **Everything else** (empty lines, un-prefixed lines, tabs) is treated as context and advances both `oldLine` and `newLine`.
