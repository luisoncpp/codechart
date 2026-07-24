# Project Config and Unreal Paths

**Status: implemented.** Source: `src-tauri/src/unreal_config/`,
`src-tauri/src/references/cpp.rs`, `src/features/project_config/`.

## Responsibility

CodeChart stores project-local application settings at `.codechart/config.json`.
The Settings menu edits the preferred editor for module files and, for C++
projects, opens the existing include-path configuration modal. Unreal support
layers project-local include-path configuration on top of the C++ adapter.

```json
{
  "editor": "code",
  "unreal": {
    "knownPaths": ["Source/Game/Public", "Source/Game/Private"],
    "hideGeneratedFiles": true,
    "excludeEngineReferences": true
  }
}
```

`editor` is the application name or full executable path passed to Tauri
`openPath`. Missing values deserialize as `code`, keeping existing config files
backward compatible. Editor and Unreal modal saves use read-modify-write so
neither setting replaces the other.

## Unreal Defaults

`tauri_api::analyze_project` calls `unreal_config::ensure_unreal_defaults`
before filesystem analysis. If no config exists and the folder looks like an
Unreal project (`*.uproject`, `*.uplugin`, or `*.Build.cs`), CodeChart writes
deduced defaults:

- `Source`
- each `*.Build.cs` directory
- each module's `Public`, `Private`, and `Classes` folders

`load_project_snapshot` does not write defaults; git-ref analysis stays
read-only.

## Analysis Behavior

`analysis::analyze_project` reads `.codechart/config.json` through
`ProjectSource`. If no config exists, in-memory analysis still derives Unreal
options from the source file list, but non-Unreal projects get no Unreal
filtering.

Only the C++ resolver reads `unreal.knownPaths`. Other language adapters ignore
this config. The two toggles below are the Unreal-specific parts:

When `hideGeneratedFiles` is true, analysis ignores `**/*.generated.h`,
`**/*.gen.cpp`, `Intermediate/**`, `Binaries/**`, `Saved/**`, and
`DerivedDataCache/**`. Filesystem walks also skip the heavy Unreal output
directories.

When resolving C++ includes, `references::cpp` first searches beside the
importer, then strips a leading `./` and searches `knownPaths`. If no project
file matches, a bare quoted include is external metadata because Unreal module
dependencies may supply it from outside the analyzed root. An explicitly
relative `./` or `../` miss remains an unresolved warning. Generated includes
are external when `hideGeneratedFiles` is true; common Unreal Engine
headers/prefixes are external when `excludeEngineReferences` is true.
