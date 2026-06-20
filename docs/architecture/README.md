# Architecture Docs

Canonical technical guides — the single source of truth for each subsystem's design, data model, and behavior rules.

Covers only what's already implemented. For architecture docs of not implemented yet, check `docs/plans`

| File | Subsystem | Notes |
|------|-----------|-------|
| [contract.md](./contract.md) | `ProjectGraph` contract + `ProjectGraphBuilder` invariants | The IPC data shape; golden-fixture North Star |
| [language-adapter.md](./language-adapter.md) | `LanguageAdapter` seam (TS adapter) + `semantic_comments` | One file → `ParsedModule`; `@Architecture` parsing |
