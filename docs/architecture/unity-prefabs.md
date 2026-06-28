# Unity prefab assets

**Status: implemented.** Source: `src-tauri/src/unity_assets/`,
`src-tauri/src/language_adapter/unity_prefab/`, `src-tauri/src/references/unity.rs`.

## Responsibility

Text-serialized Unity `.prefab` files become `ModuleNode`s with language
`unityPrefab`. YAML `m_Script` guids resolve to `.cs` modules via a project-wide
`.meta` index; other guid refs resolve to nested `.prefab` assets. Scenes (`.unity`)
are deferred.

## Pipeline

1. `unity_assets::index_meta_files` — every `*.meta` → `guid → asset path` (`.cs`,
   `.prefab`, …). Meta files are indexed but never become modules.
2. `UnityPrefabAdapter` — requires `%YAML` header; extracts `unity_script_guids`
   (`m_Script` lines), `unity_asset_guids` (all other guid refs), and
   `exported_symbols` (custom fields under `MonoBehaviour:` blocks, excluding
   Unity `m_*` internals).
3. `references::classify_unity_assets` — post-pass (peer of `classify_tauri_ipc`):
   - prefab → `.cs` soft edge, `trigger = "unity:script:<guid>"`
   - prefab → `.prefab` soft edge, `trigger = "unity:prefab:<guid>"`
   - unresolved guid → `unresolvedUnityAsset` diagnostic (no dangling edge)

Built-in ignores include `Library/**`, `Temp/**`, `Logs/**` for Unity projects.

## Frontend

Inspection panel lists Unity soft edges under **Scripts used** /
**Nested prefabs** with reverse labels (`used by ←`, `referenced by ←`).
Prefab `exported_symbols` render on the canvas like code exports (L1.5 symbol grid).

## Fixture

`tests/fixtures/unity-mini-project/` — `Player.prefab` → `PlayerController.cs`,
`Weapon.prefab`, `Shield.prefab` (field ref + nested `m_SourcePrefab`).
