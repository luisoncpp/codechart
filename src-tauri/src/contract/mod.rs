pub mod builder;
pub mod types;
mod validate;

pub use builder::ProjectGraphBuilder;
pub use validate::BuildError;
pub use types::{
    Annotation, Diagnostic, DiagnosticKind, Edge, EdgeKind, GroupNode, Language, ModuleMetrics,
    ModuleNode, ProjectGraph, Severity,
};

#[cfg(test)]
mod contract_tests {
    use super::*;

    #[test]
    fn parses_trivial_project_graph_json() {
        let json = include_str!("../../../tests/fixtures/trivial-graph.json");
        let graph: ProjectGraph = serde_json::from_str(json).expect("valid ProjectGraph JSON");

        assert_eq!(graph.version, 1);
        assert_eq!(graph.modules.len(), 1);
        assert_eq!(graph.modules[0].id, "src/index.ts");
        assert!(graph.modules[0].is_facade);
    }

    fn load_golden() -> ProjectGraph {
        let json = include_str!("../../../tests/fixtures/golden/project-graph.json");
        serde_json::from_str(json).expect("golden project-graph.json is valid ProjectGraph JSON")
    }

    #[test]
    fn golden_matches_the_planted_fixture_facts() {
        let graph = load_golden();
        assert_eq!(graph.groups.len(), 5, "3 responsibility + 1 aggregate + 1 cross-cutting");
        assert_eq!(graph.modules.len(), 13);
        assert_eq!(graph.edges.len(), 21, "20 imports + 1 soft (event) edge");
        assert_eq!(graph.diagnostics.len(), 2, "unresolved import + facade bypass");
        let kinds: Vec<&DiagnosticKind> = graph.diagnostics.iter().map(|d| &d.kind).collect();
        assert!(kinds.contains(&&DiagnosticKind::UnresolvedImport));
        assert!(kinds.contains(&&DiagnosticKind::ArchitectureViolation));

        let facades: usize = graph.modules.iter().filter(|m| m.is_facade).count();
        assert_eq!(facades, 3, "one facade per group");

        // The planted facade bypass is present *and* flagged as a violation (Phase 8).
        let bypass = graph.edges.iter().find(|e| {
            e.source == "src/ui/TodoList.tsx" && e.target == "src/core/store.ts"
        });
        assert!(bypass.expect("planted facade-bypass import is present").is_violation);

        let annotated = graph
            .modules
            .iter()
            .find(|m| m.id == "src/services/http.ts")
            .expect("http module exists");
        assert!(annotated.annotation.is_some(), "planted @Architecture block");

        let core = graph.groups.iter().find(|g| g.id == "core").expect("core group");
        let doc = core.annotation.as_ref().expect("group doc from core.group.md");
        assert!(doc.description_long.is_some(), "group body populates annotation");
        assert_eq!(core.parent_id.as_deref(), Some("app"), "nested under the app group");

        // Cross-cutting `shared` group pulls modules from two folders (match + files),
        // winning over folder ownership.
        let shared: Vec<&str> = graph
            .modules
            .iter()
            .filter(|m| m.group_id.as_deref() == Some("shared"))
            .map(|m| m.id.as_str())
            .collect();
        assert_eq!(shared, ["src/core/todo.ts", "src/services/types.ts"]);
    }

    #[test]
    fn builder_accepts_the_golden_model() {
        let graph = load_golden();
        let mut builder = ProjectGraphBuilder::new().version(graph.version).root(graph.root);
        for group in graph.groups {
            builder = builder.group(group);
        }
        for module in graph.modules {
            builder = builder.module(module);
        }
        for edge in graph.edges {
            builder = builder.edge(edge);
        }
        builder.build().expect("golden model satisfies every §2.2 invariant");
    }
}
