use std::collections::HashMap;

use crate::contract::{DiagnosticKind, ProjectGraph};
use crate::project_source::{FsProjectSource, MemoryProjectSource};

use super::analyze_project;

fn memory(files: &[(&str, &str)]) -> MemoryProjectSource {
    let map: HashMap<String, String> =
        files.iter().map(|(p, c)| ((*p).to_string(), (*c).to_string())).collect();
    MemoryProjectSource::new(map)
}

const FIXTURE_DIR: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/../tests/fixtures/ts-basic-project");
const GOLDEN_ROOT: &str = "tests/fixtures/ts-basic-project";

fn golden() -> ProjectGraph {
    let json = include_str!("../../../tests/fixtures/golden/project-graph.json");
    serde_json::from_str(json).expect("golden project-graph.json parses")
}

/// ⭐ The Phase 4 backend gate: analyzing the reference project must reproduce the
/// hand-authored golden model exactly.
#[test]
fn analyze_matches_the_golden_fixture() {
    let source = FsProjectSource::new(FIXTURE_DIR);
    let graph = analyze_project(&source, GOLDEN_ROOT).expect("fixture analysis builds a valid graph");
    assert_eq!(graph, golden());
}

/// Phase 8: the planted facade bypass (`ui/TodoList → core/store`) is the *only*
/// flagged edge, and it carries an `architectureViolation` diagnostic.
#[test]
fn flags_the_planted_facade_bypass_with_no_false_positives() {
    let source = FsProjectSource::new(FIXTURE_DIR);
    let graph = analyze_project(&source, GOLDEN_ROOT).expect("builds");
    let violations: Vec<_> = graph.edges.iter().filter(|e| e.is_violation).collect();
    assert_eq!(violations.len(), 1, "exactly one violation — no false positives");
    assert_eq!(violations[0].source, "src/ui/TodoList.tsx");
    assert_eq!(violations[0].target, "src/core/store.ts");
    let diag = graph
        .diagnostics
        .iter()
        .find(|d| d.kind == DiagnosticKind::ArchitectureViolation)
        .expect("a violation diagnostic");
    assert_eq!(diag.module_id.as_deref(), Some("src/ui/TodoList.tsx"));
    assert_eq!(diag.edge_id.as_deref(), Some(violations[0].id.as_str()));
}

/// Phase 9 + 10: the planted soft edges — one event seam (store→App) and one
/// interface seam (App→store via ITodoStore).
#[test]
fn classifies_the_planted_soft_edges() {
    let source = FsProjectSource::new(FIXTURE_DIR);
    let graph = analyze_project(&source, GOLDEN_ROOT).expect("builds");
    let soft: Vec<_> = graph
        .edges
        .iter()
        .filter(|e| e.kind == crate::contract::EdgeKind::Soft)
        .collect();
    assert_eq!(soft.len(), 2, "one event seam + one interface seam");

    let event = soft.iter().find(|e| e.trigger.starts_with("event:")).expect("event seam");
    assert_eq!(event.source, "src/core/store.ts");
    assert_eq!(event.target, "src/ui/App.tsx");
    assert_eq!(event.trigger, "event:todos:changed");

    let iface = soft.iter().find(|e| e.trigger.starts_with("interface:")).expect("interface seam");
    assert_eq!(iface.source, "src/ui/App.tsx");
    assert_eq!(iface.target, "src/core/store.ts");
    assert_eq!(iface.trigger, "interface:ITodoStore");
}

#[test]
fn unresolved_import_produces_a_warning_diagnostic_and_no_edge() {
    let source = memory(&[("src/a.ts", "import { x } from \"./gone\";")]);
    let graph = analyze_project(&source, "mem").expect("builds");
    assert!(graph.edges.is_empty());
    assert_eq!(graph.diagnostics.len(), 1);
    assert_eq!(graph.diagnostics[0].kind, DiagnosticKind::UnresolvedImport);
}

#[test]
fn unreal_defaults_hide_generated_files_and_resolve_include_roots() {
    let source = memory(&[
        ("Game.uproject", "{}"),
        ("Source/Game/Game.Build.cs", ""),
        ("Source/Game/Public/Characters/Player.h", "class Player {};"),
        (
            "Source/Game/Private/Player.cpp",
            "#include \"Characters/Player.h\"\n#include \"CoreMinimal.h\"\n",
        ),
        ("Source/Game/Private/Player.generated.h", "class Generated {};"),
    ]);
    let graph = analyze_project(&source, "mem").expect("builds");
    assert!(
        graph.modules.iter().all(|m| !m.id.ends_with(".generated.h")),
        "generated Unreal headers should not become graph modules"
    );
    assert!(graph.diagnostics.is_empty(), "engine header should be external");
    assert!(graph.edges.iter().any(|e| {
        e.source == "Source/Game/Private/Player.cpp"
            && e.target == "Source/Game/Public/Characters/Player.h"
    }));
}

/// A source whose `b.ts` cannot be read — exercises the `parseError` partial path.
struct FlakySource;

impl crate::project_source::ProjectSource for FlakySource {
    fn list_files(&self) -> Result<Vec<String>, crate::project_source::ProjectSourceError> {
        Ok(vec!["src/a.ts".into(), "src/b.ts".into()])
    }
    fn read_file(&self, path: &str) -> Result<String, crate::project_source::ProjectSourceError> {
        match path {
            "src/a.ts" => Ok("export const a = 1;".into()),
            other => Err(crate::project_source::ProjectSourceError::NotFound(other.into())),
        }
    }
}

#[test]
fn partial_results_one_unreadable_file_still_builds_the_graph() {
    let graph = analyze_project(&FlakySource, "mem").expect("builds despite a failed file");
    assert_eq!(graph.modules.len(), 1, "only the readable file becomes a module");
    assert_eq!(graph.modules[0].id, "src/a.ts");
    let parse_errors: Vec<_> = graph
        .diagnostics
        .iter()
        .filter(|d| d.kind == DiagnosticKind::ParseError)
        .collect();
    assert_eq!(parse_errors.len(), 1);
    assert_eq!(parse_errors[0].id, "parseError:src/b.ts");
}

const TAURI_FIXTURE_DIR: &str =
    concat!(env!("CARGO_MANIFEST_DIR"), "/../tests/fixtures/tauri-mini-project");
const TAURI_FIXTURE_ROOT: &str = "tests/fixtures/tauri-mini-project";

fn tauri_mini_golden() -> ProjectGraph {
    let json = include_str!("../../../tests/fixtures/golden/tauri-mini-project-graph.json");
    serde_json::from_str(json).expect("tauri-mini golden project-graph.json parses")
}

#[test]
fn analyze_matches_the_tauri_mini_golden_fixture() {
    let source = FsProjectSource::new(TAURI_FIXTURE_DIR);
    let graph =
        analyze_project(&source, TAURI_FIXTURE_ROOT).expect("tauri-mini fixture analysis builds");
    assert_eq!(graph, tauri_mini_golden());
}

#[test]
fn tauri_mini_project_ipc_seams_and_orphan_diagnostic() {
    let source = FsProjectSource::new(TAURI_FIXTURE_DIR);
    let graph = analyze_project(&source, TAURI_FIXTURE_ROOT).expect("builds");
    let ipc: Vec<_> = graph
        .edges
        .iter()
        .filter(|e| e.trigger.starts_with("ipc:"))
        .collect();
    assert_eq!(ipc.len(), 1, "greet invoke pairs with greet command");
    assert_eq!(ipc[0].source, "src/ipc/client.ts");
    assert_eq!(ipc[0].target, "src-tauri/src/commands.rs");
    assert_eq!(ipc[0].trigger, "ipc:greet");

    let orphans: Vec<_> = graph
        .diagnostics
        .iter()
        .filter(|d| d.kind == DiagnosticKind::UnresolvedIpc)
        .collect();
    assert_eq!(orphans.len(), 1);
    assert_eq!(orphans[0].module_id.as_deref(), Some("src/ipc/orphan.ts"));
}

const UNITY_FIXTURE_DIR: &str =
    concat!(env!("CARGO_MANIFEST_DIR"), "/../tests/fixtures/unity-mini-project");
const UNITY_FIXTURE_ROOT: &str = "tests/fixtures/unity-mini-project";
const UNREAL_FIXTURE_DIR: &str =
    concat!(env!("CARGO_MANIFEST_DIR"), "/../tests/fixtures/unreal-mini-project");
const UNREAL_FIXTURE_ROOT: &str = "tests/fixtures/unreal-mini-project";

#[test]
fn unity_mini_project_prefab_script_and_prefab_edges() {
    let source = FsProjectSource::new(UNITY_FIXTURE_DIR);
    let graph = analyze_project(&source, UNITY_FIXTURE_ROOT).expect("builds");
    let player = "Assets/Prefabs/Player.prefab";
    let script = "Assets/Scripts/PlayerController.cs";
    let weapon = "Assets/Prefabs/Weapon.prefab";
    let shield = "Assets/Prefabs/Shield.prefab";

    let player_mod = graph.modules.iter().find(|m| m.id == player).expect("player prefab");
    assert_eq!(player_mod.language, crate::contract::Language::UnityPrefab);
    assert_eq!(player_mod.exported_symbols, vec!["speed", "weaponPrefab"]);

    let unity: Vec<_> = graph
        .edges
        .iter()
        .filter(|e| e.trigger.starts_with("unity:"))
        .collect();
    assert_eq!(unity.len(), 3, "script + weapon field + nested shield");

    let script_edge = unity
        .iter()
        .find(|e| e.trigger.starts_with("unity:script:"))
        .expect("prefab → script");
    assert_eq!(script_edge.source, player);
    assert_eq!(script_edge.target, script);

    let prefab_edges: Vec<_> = unity
        .iter()
        .filter(|e| e.trigger.starts_with("unity:prefab:"))
        .collect();
    assert_eq!(prefab_edges.len(), 2);
    assert!(prefab_edges.iter().any(|e| e.target == weapon));
    assert!(prefab_edges.iter().any(|e| e.target == shield));

    let reverse: Vec<_> = graph
        .edges
        .iter()
        .filter(|e| e.target == script && e.trigger.starts_with("unity:script:"))
        .collect();
    assert_eq!(reverse.len(), 1);
    assert_eq!(reverse[0].source, player);
}

#[test]
fn unreal_mini_project_resolves_includes_and_hides_generated_files() {
    let source = FsProjectSource::new(UNREAL_FIXTURE_DIR);
    let graph = analyze_project(&source, UNREAL_FIXTURE_ROOT).expect("builds");
    let source_file = "Source/MiniGame/Private/MiniPlayer.cpp";
    let header = "Source/MiniGame/Public/Characters/MiniPlayer.h";
    assert!(graph.modules.iter().any(|m| m.id == source_file));
    assert!(graph.modules.iter().any(|m| m.id == header));
    assert!(
        graph.modules.iter().all(|m| !m.id.ends_with(".generated.h")),
        "generated Unreal headers should stay hidden"
    );
    assert!(graph.diagnostics.is_empty(), "engine includes should be external");
    assert!(graph.edges.iter().any(|e| e.source == source_file && e.target == header));
}

