use crate::contract::ProjectGraph;
use crate::project_source::FsProjectSource;

use super::{analyze_project, read_module_source, search_module_sources};

const FIXTURE_DIR: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../tests/fixtures/ts-basic-project"
);
const WORKSPACE_DIR: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/..");

fn golden() -> ProjectGraph {
    let json = include_str!("../../../tests/fixtures/golden/project-graph.json");
    serde_json::from_str(json).expect("golden project-graph.json parses")
}

/// The Phase 7 end-to-end gate: invoking the Tauri command on the reference
/// project reproduces the golden model. The command uses its `path` argument as
/// the graph `root`, so the only field that differs from the golden (whose root
/// is the repo-relative fixture path) is `root` — patched here before the diff.
#[test]
fn command_on_the_fixture_returns_the_golden_model() {
    let graph = analyze_project(FIXTURE_DIR.to_string(), None, None).expect("analysis succeeds");

    let mut expected = golden();
    expected.root = FIXTURE_DIR.to_string();

    assert_eq!(graph, expected);
}

#[test]
fn command_on_a_missing_folder_yields_an_empty_graph() {
    // A non-existent root lists no files; analysis still builds a valid (empty) graph.
    let graph = analyze_project(format!("{FIXTURE_DIR}/does-not-exist"), None, None)
        .expect("builds an empty graph");
    assert!(graph.modules.is_empty());
    assert!(graph.edges.is_empty());
}

/// Phase 10: the L2 snippet command reads a module's source by repo-relative id.
#[test]
fn read_module_source_returns_a_modules_contents() {
    let src = read_module_source(FIXTURE_DIR.to_string(), "src/services/http.ts".to_string())
        .expect("reads the file");
    // The annotated module carries its @Architecture block in the source.
    assert!(src.contains("@Architecture"));
}

/// Project search: the command scans the given modules' working-tree sources.
#[test]
fn search_module_sources_finds_text_in_fixture_modules() {
    let result = search_module_sources(
        FIXTURE_DIR.to_string(),
        "maketodo".to_string(),
        vec![
            "src/core/store.ts".to_string(),
            "src/core/todo.ts".to_string(),
        ],
    );

    let matched_paths: Vec<&str> = result.matches.iter().map(|m| m.path.as_str()).collect();
    assert!(matched_paths.contains(&"src/core/store.ts"));
    assert!(matched_paths.contains(&"src/core/todo.ts"));
    let todo_match = result
        .matches
        .iter()
        .find(|m| m.path == "src/core/todo.ts")
        .unwrap();
    assert_eq!(todo_match.line, 8);
    assert!(result
        .matches
        .iter()
        .all(|m| m.line_text.contains("makeTodo")));
    assert!(!result.truncated);
}

#[test]
fn command_rejects_a_zero_day_metrics_window() {
    let result = analyze_project(FIXTURE_DIR.to_string(), Some(0), None);
    assert_eq!(
        result.unwrap_err(),
        "Metrics window must be at least one day."
    );
}

#[test]
fn search_command_does_not_bypass_the_backend_shell_facade() {
    let source = FsProjectSource::new(WORKSPACE_DIR);
    let graph = crate::analysis::analyze_project(&source, WORKSPACE_DIR).expect("builds");

    assert!(
        graph.edges.iter().all(|edge| {
            edge.source != "src-tauri/src/tauri_api/mod.rs"
                || edge.target != "src-tauri/src/search/mod.rs"
        }),
        "Tauri commands must access search through the backend_shell facade"
    );
}

#[test]
fn startup_args_command_does_not_bypass_the_backend_shell_facade() {
    let source = FsProjectSource::new(WORKSPACE_DIR);
    let graph = crate::analysis::analyze_project(&source, WORKSPACE_DIR).expect("builds");

    assert!(
        graph.edges.iter().all(|edge| {
            edge.source != "src-tauri/src/tauri_api/mod.rs"
                || edge.target != "src-tauri/src/startup_args/mod.rs"
        }),
        "Tauri commands must access startup_args through the backend_shell facade"
    );
}

#[test]
fn read_module_source_on_a_missing_file_errors() {
    let result = read_module_source(FIXTURE_DIR.to_string(), "src/nope.ts".to_string());
    assert!(result.is_err());
}
