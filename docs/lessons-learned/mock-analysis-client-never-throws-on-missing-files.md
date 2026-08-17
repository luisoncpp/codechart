# The mock analysis client never fails a file read

`createMockAnalysisClient().readModuleSource(root, path)` ignores `root`, resolves `path` by
**suffix match** against a compile-time glob
(`tests/fixtures/ts-basic-project/**/*.{ts,tsx,md}`), and returns the placeholder string
`` `// <path>` `` when nothing matches. It never rejects.

Consequences worth knowing before writing code or tests against it:

- **`catch` branches are unreachable in mock/dev mode.** Anything that distinguishes
  "unreadable" from "read" — a wiki-link destination that does not exist, `ensureGroupDocs`'
  `_Could not load …_` fallback — behaves as *readable* with placeholder content. Test those
  paths with a stub client that throws (`{ ...createMockAnalysisClient(), readModuleSource: async () => { throw … } }`),
  never by pointing at a missing file.
- **Fallback chains that trigger on failure never advance.** `wikiLinkCandidates` orders several
  candidate paths and takes the first readable one; under the mock the first candidate always
  "succeeds". That is why a bare name tries the *module* match first instead of relying on a
  failed root read to fall through — ordering that depends on read failures would work in the
  packaged app and silently differ in dev.
- **Only `.ts`, `.tsx` and `.md` under the fixture project exist.** No `docs/` tree, so real
  `architectureDoc` paths never resolve in mock mode; a doc-shaped test needs a fixture file that
  actually exists (`README.md`) or an overridden client.

The real path (`read_module_source` → `FsProjectSource::read_file`) does propagate IO errors, and
it accepts **any** project-relative path with no module validation and no traversal guard — the
guard lives in the frontend (`resolveWikiPath`).
