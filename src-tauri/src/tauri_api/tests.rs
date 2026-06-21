use crate::contract::ProjectGraph;

use super::{analyze_project, read_module_source};

const FIXTURE_DIR: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/../tests/fixtures/ts-basic-project");

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
    let graph = analyze_project(FIXTURE_DIR.to_string()).expect("analysis succeeds");

    let mut expected = golden();
    expected.root = FIXTURE_DIR.to_string();

    assert_eq!(graph, expected);
}

#[test]
fn command_on_a_missing_folder_yields_an_empty_graph() {
    // A non-existent root lists no files; analysis still builds a valid (empty) graph.
    let graph =
        analyze_project(format!("{FIXTURE_DIR}/does-not-exist")).expect("builds an empty graph");
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

#[test]
fn read_module_source_on_a_missing_file_errors() {
    let result = read_module_source(FIXTURE_DIR.to_string(), "src/nope.ts".to_string());
    assert!(result.is_err());
}
