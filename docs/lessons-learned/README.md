# Lessons Learned

Knowledge that helps future development: effective strategies, counter-intuitive facts, and patterns worth remembering across the codebase.

## When to Add

- When a strategy that seemed right turned out to be wrong or suboptimal.
- When something counter-intuitive was discovered through experimentation.
- When a workaround for external dependency behavior was needed and the reason isn't obvious from code.
- When a pattern proved effective and worth formalizing.

## How to Add

Create a new file in this directory named after the topic (e.g., `quill-bounds-always-relative-to-container.md`, `optimistic-ui-pattern-for-toggle-sync.md`). Then add it to the index below.

The entry should answer: **what is counter-intuitive or effective that I should know before starting similar work?**

Avoid: "bug description + fix". Prefer: "what I learned that applies to future work."

## Index

| File | Topic | Date |
|------|-------|------|
| [create-tauri-app-force-deletes-untracked-files.md](./create-tauri-app-force-deletes-untracked-files.md) | Scaffolding with `-f` can wipe untracked project files | 2026-06-19 |
| [single-parent-collapses-overlap-invariants.md](./single-parent-collapses-overlap-invariants.md) | A single `groupId`/`parentId` makes 2 of 5 graph invariants structural | 2026-06-19 |
| [tree-sitter-crate-version-pairing.md](./tree-sitter-crate-version-pairing.md) | tree-sitter runtime/grammar crate versions + 0.24 API shape for new adapters | 2026-06-19 |
| [group-body-becomes-descriptionlong-verbatim.md](./group-body-becomes-descriptionlong-verbatim.md) | `*.group.md` body → `descriptionLong` byte-for-byte; copy golden annotation text from the file (em-dash bug, fixed) | 2026-06-19 |
| [tree-sitter-error-tolerant-no-parse-error.md](./tree-sitter-error-tolerant-no-parse-error.md) | Malformed source never yields a `ParseError`; test the `parseError` path via a read failure | 2026-06-20 |
| [react-flow-jsdom-testing.md](./react-flow-jsdom-testing.md) | React Flow under jsdom: required polyfills, edges don't render, use `fireEvent` not `userEvent` | 2026-06-20 |
| [analyze-command-root-equals-path.md](./analyze-command-root-equals-path.md) | The Tauri command's `path` arg is both fs root and graph `root`; ids stay repo-relative — patch `root` to diff against golden | 2026-06-20 |
| [edge-classifiers-are-post-passes-not-in-resolve.md](./edge-classifiers-are-post-passes-not-in-resolve.md) | Drift (P8) / soft edges (P9) are separate passes over resolved edges; `resolve_references` stays pure + group-agnostic | 2026-06-20 |
