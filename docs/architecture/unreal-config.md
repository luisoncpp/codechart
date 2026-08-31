# Project Config and Unreal Paths

**Status: implemented.** Source: `src-tauri/src/unreal_config/`,
`src-tauri/src/references/cpp.rs`, `src/features/project_config/`.

## Responsibility

CodeChart stores project-local application settings at `.codechart/config.json`.
The Settings menu edits the preferred editor for module files, the list of
ignored directories, and, for C++ projects, opens the existing include-path
configuration modal. Unreal support layers project-local include-path
configuration on top of the C++ adapter.

```json
{
  "editor": "code",
  "ignoredPaths": ["vendor", "Source/ThirdParty"],
  "unreal": {
    "knownPaths": ["Source/Game/Public", "Source/Game/Private"],
    "hideGeneratedFiles": true,
    "excludeEngineReferences": true,
    "hidePlugins": true
  }
}
```

`editor` is the application name or full executable path passed to Tauri
`openPath`. Missing values deserialize as `code`, keeping existing config files
backward compatible. `hidePlugins` missing from an old file deserializes as
`true`. Editor and Unreal modal saves use read-modify-write so neither setting
replaces the other. View ▾ **Hide plugins** also read-modify-writes only that
flag, then reloads analysis.

`unreal` is also `#[serde(default)]`, so a hand-written config that sets only
`editor` or `ignoredPaths` still parses (before, a missing `unreal` key silently
discarded the whole file). Such a partial file gets the Unreal-on defaults; the
app's modals always write the complete config, so only hand-edits see this.

## Ignored Paths

`ignoredPaths` are repo-relative **directory paths** — not globs. Each entry
ignores that directory and its whole subtree, so `Source/ThirdParty` never
affects `Other/ThirdParty`. Entries are trimmed, `\` becomes `/`, surrounding
slashes are stripped, blanks dropped, and the list is deduped
(`project_config::normalize_ignored_path`).

Two layers enforce it and must agree:

- **Correctness** — `analysis::listed_files` drops ignored paths *before*
  `discover_group_defs_from`, so a `*.group.md` inside an ignored directory
  declares no group and emits no `configError`. The globs (`<p>/**` and `<p>`)
  also join the `ignore_patterns_with_unreal` set.
- **Performance** — `analysis_fs_source` passes the same entries to
  `FsProjectSource::with_ignored_dirs`, so the walk never descends into them.
  Unlike the `Plugins` rule (a directory *name*, matched at any depth), these are
  exact paths.

An ignored directory contributes no modules, groups, edges, or diagnostics.
Imports that used to resolve into it become `unresolvedImport` like any other
missing relative target. Both the app and `codechart-cli` read the same list —
there is no CLI flag.

## Unreal Defaults

`tauri_api::analyze_project` calls `unreal_config::ensure_unreal_defaults`
before filesystem analysis. If no config exists and the folder looks like an
Unreal project (`*.uproject`, `*.uplugin`, or `*.Build.cs`), CodeChart writes
deduced defaults:

- `Source`
- each `*.Build.cs` directory
- each module's `Public`, `Private`, and `Classes` folders

`load_project_snapshot` does not write defaults; git-ref analysis stays
read-only. `codechart-cli check` also stays read-only: it reads deduced Unreal
options in memory and never calls `ensure_unreal_defaults`.

## Analysis Behavior

`analysis::analyze_project` reads `.codechart/config.json` through
`ProjectSource`. If no config exists, in-memory analysis still derives Unreal
options from the source file list, but non-Unreal projects get no Unreal
filtering.

Only the C++ resolver reads `unreal.knownPaths`. Other language adapters ignore
this config. The Unreal-specific filters:

When `hideGeneratedFiles` is true, analysis ignores `**/*.generated.h`,
`**/*.gen.cpp`, `Intermediate/**`, `Binaries/**`, `Saved/**`, and
`DerivedDataCache/**`. Filesystem walks also skip the heavy Unreal output
directories.

When `hidePlugins` is true (default for Unreal projects), analysis drops every
path whose segments include a `Plugins` directory, and filesystem analysis does
not recurse into directories named `Plugins` (same idea as `node_modules`).
Git snapshots still *list* those paths but do not read plugin blobs. Include-path
deduction (`ensure_unreal_defaults`) still walks Plugins so `knownPaths` keeps
plugin `Public/` roots; unhiding reconnects includes without a second deduce.
Non-Unreal projects never apply this filter. `ProjectGraph.isUnrealProject` is
set from the pre-filter file list so View ▾ **Hide plugins** stays visible even
when every `.Build.cs` lived under Plugins.

When resolving C++ includes, `references::cpp` first searches beside the
importer, then strips a leading `./` and searches `knownPaths`. If no project
file matches, a bare quoted include is external metadata because Unreal module
dependencies may supply it from outside the analyzed root. An explicitly
relative `./` or `../` miss remains an unresolved warning. Generated includes
are external when `hideGeneratedFiles` is true; common Unreal Engine
headers/prefixes are external when `excludeEngineReferences` is true. Hidden
plugin headers used as bare quoted includes are likewise external.
