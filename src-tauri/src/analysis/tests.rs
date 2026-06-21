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

#[test]
fn unresolved_import_produces_a_warning_diagnostic_and_no_edge() {
    let source = memory(&[("src/a.ts", "import { x } from \"./gone\";")]);
    let graph = analyze_project(&source, "mem").expect("builds");
    assert!(graph.edges.is_empty());
    assert_eq!(graph.diagnostics.len(), 1);
    assert_eq!(graph.diagnostics[0].kind, DiagnosticKind::UnresolvedImport);
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
