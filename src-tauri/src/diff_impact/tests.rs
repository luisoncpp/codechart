use super::*;
use crate::contract::{
    Diagnostic, DiagnosticKind, Edge, EdgeKind, Language, ModuleMetrics, ModuleNode, ProjectGraph,
    Severity,
};

pub(super) fn module(id: &str, group: Option<&str>) -> ModuleNode {
    ModuleNode {
        id: id.to_string(),
        path: id.to_string(),
        label: id.to_string(),
        group_id: group.map(str::to_string),
        is_facade: false,
        language: Language::TypeScript,
        metrics: ModuleMetrics {
            loc: 10,
            churn: None,
            bug_risk: None,
            fix_commits: None,
        },
        exported_symbols: vec![],
        annotation: None,
    }
}

pub(super) fn import_edge(source: &str, target: &str) -> Edge {
    Edge {
        id: format!("{source}->{target}"),
        source: source.to_string(),
        target: target.to_string(),
        kind: EdgeKind::Import,
        is_violation: false,
        trigger: String::new(),
    }
}

pub(super) fn sample_graph(diagnostics: Vec<Diagnostic>) -> ProjectGraph {
    ProjectGraph {
        version: 1,
        root: "/repo".to_string(),
        is_unreal_project: Some(false),
        groups: vec![],
        modules: vec![
            module("src/model.ts", Some("data")),
            module("src/api.ts", Some("api")),
            module("src/ui.ts", Some("ui")),
            module("src/dashboard.ts", Some("app")),
        ],
        edges: vec![
            import_edge("src/api.ts", "src/model.ts"),
            import_edge("src/ui.ts", "src/api.ts"),
            import_edge("src/dashboard.ts", "src/ui.ts"),
        ],
        diagnostics,
    }
}

#[test]
fn computes_foundation_first_topo_layers_and_blast_radius() {
    let graph = sample_graph(vec![]);
    let changed = vec![
        "src/ui.ts".to_string(),
        "src/model.ts".to_string(),
        "src/api.ts".to_string(),
    ];
    let report = analyze_diff_impact(DiffImpactInput {
        before: None,
        after: &graph,
        changed_module_ids: &changed,
        max_depth: 3,
    });

    assert_eq!(report.layers.len(), 3);
    assert_eq!(report.layers[0].module_ids, vec!["src/model.ts"]);
    assert_eq!(report.layers[1].module_ids, vec!["src/api.ts"]);
    assert_eq!(report.layers[1].depends_on_layers, vec![0]);
    assert_eq!(report.layers[2].module_ids, vec!["src/ui.ts"]);
    assert_eq!(report.layers[2].depends_on_layers, vec![1]);

    assert_eq!(report.blast_radius.len(), 1);
    assert_eq!(report.blast_radius[0].module_id, "src/dashboard.ts");
    assert_eq!(report.blast_radius[0].depth, 1);
    assert_eq!(report.blast_radius[0].via_module_ids, vec!["src/ui.ts"]);
}

#[test]
fn detects_newly_introduced_diagnostics() {
    let old_diag = Diagnostic {
        id: "d1".to_string(),
        kind: DiagnosticKind::UnresolvedImport,
        severity: Severity::Warning,
        module_id: Some("src/api.ts".to_string()),
        edge_id: None,
        unresolved_target: None,
        message: "old".to_string(),
    };
    let new_diag = Diagnostic {
        id: "d2".to_string(),
        kind: DiagnosticKind::CircularDependency,
        severity: Severity::Error,
        module_id: Some("src/model.ts".to_string()),
        edge_id: None,
        unresolved_target: None,
        message: "cycle".to_string(),
    };
    let before = sample_graph(vec![old_diag.clone()]);
    let after = sample_graph(vec![old_diag, new_diag.clone()]);
    let delta = compute_delta_diagnostics(Some(&before), &after);
    assert_eq!(delta, vec![new_diag]);
}
