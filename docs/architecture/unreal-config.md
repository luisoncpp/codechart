# Unreal Project Config

**Status: implemented.** Source: `src-tauri/src/unreal_config/`,
`src-tauri/src/references/cpp.rs`, `src/features/project_config/`.

## Responsibility

Unreal support layers project-local include-path configuration on top of the
existing C++ adapter. The config lives at `.codechart/config.json` in the
analyzed project and is edited from the header's `Configure paths...` modal.

```json
{
  "unreal": {
    "knownPaths": ["Source/Game/Public", "Source/Game/Private"],
    "hideGeneratedFiles": true,
    "excludeEngineReferences": true
  }
}
```

## Defaults

`tauri_api::analyze_project` calls `unreal_config::ensure_unreal_defaults`
before filesystem analysis. If no config exists and the folder looks like an
Unreal project (`*.uproject`, `*.uplugin`, or `*.Build.cs`), CodeChart writes
deduced defaults:

- `Source`
- each `*.Build.cs` directory
- each module's `Public`, `Private`, and `Classes` folders

`analyze_project_at_ref` does not write defaults; git-ref analysis stays
read-only.

## Analysis Behavior

`analysis::analyze_project` reads `.codechart/config.json` through
`ProjectSource`. If no config exists, in-memory analysis still derives Unreal
options from the source file list, but non-Unreal projects get no Unreal
filtering.

When `hideGeneratedFiles` is true, analysis ignores `**/*.generated.h`,
`**/*.gen.cpp`, `Intermediate/**`, `Binaries/**`, `Saved/**`, and
`DerivedDataCache/**`. Filesystem walks also skip the heavy Unreal output
directories.

When resolving C++ includes, `references::cpp` first tries the normal relative
resolver. If that misses, it strips a leading `./` and searches `knownPaths`.
If no project file matches and `excludeEngineReferences` is true, common Unreal
Engine headers/prefixes are treated as external metadata instead of unresolved
imports.
