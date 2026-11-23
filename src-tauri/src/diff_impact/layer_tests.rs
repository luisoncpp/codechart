//! Topological layering: Rust module-tree exemptions and SCC (cycle) layers.
use super::tests::{import_edge, module, sample_graph};
use super::*;
use crate::contract::ProjectGraph;

fn graph_of(ids: &[&str], edges: &[(&str, &str)]) -> ProjectGraph {
    ProjectGraph {
        modules: ids.iter().map(|id| module(id, None)).collect(),
        edges: edges.iter().map(|(s, t)| import_edge(s, t)).collect(),
        ..sample_graph(vec![])
    }
}

fn layer_ids(layers: &[TopoLayer]) -> Vec<Vec<&str>> {
    layers
        .iter()
        .map(|l| l.module_ids.iter().map(String::as_str).collect())
        .collect()
}

fn all_ids(ids: &[&str]) -> Vec<String> {
    ids.iter().map(|id| id.to_string()).collect()
}

#[test]
fn rust_module_tree_cycles_do_not_push_modules_to_the_end() {
    // `mod` edges (lib -> cli/mod, cli/mod -> impact) + `use super`/`use crate` back-edges.
    let ids = [
        "src/lib.rs",
        "src/cli/mod.rs",
        "src/cli/impact.rs",
        "src/model.rs",
    ];
    let graph = graph_of(
        &ids,
        &[
            ("src/lib.rs", "src/cli/mod.rs"),
            ("src/lib.rs", "src/model.rs"),
            ("src/cli/mod.rs", "src/cli/impact.rs"),
            ("src/cli/impact.rs", "src/cli/mod.rs"),
            ("src/cli/impact.rs", "src/lib.rs"),
            ("src/cli/impact.rs", "src/model.rs"),
        ],
    );
    let layers = compute_topo_layers(&graph, &all_ids(&ids));
    assert_eq!(
        layer_ids(&layers),
        vec![
            vec!["src/cli/mod.rs", "src/lib.rs", "src/model.rs"],
            vec!["src/cli/impact.rs"]
        ]
    );
    assert_eq!(layers[1].depends_on_layers, vec![0]);
    assert!(layers.iter().all(|l| !l.cyclic));
}

fn sibling_cycle_graph() -> ProjectGraph {
    let ids = [
        "src/model.ts",
        "src/a.ts",
        "src/b.ts",
        "src/c.ts",
        "src/d.ts",
    ];
    graph_of(
        &ids,
        &[
            ("src/a.ts", "src/b.ts"),
            ("src/b.ts", "src/c.ts"),
            ("src/c.ts", "src/a.ts"),
            ("src/a.ts", "src/model.ts"),
            ("src/d.ts", "src/b.ts"),
        ],
    )
}

#[test]
fn genuine_sibling_cycle_becomes_one_cyclic_layer() {
    let changed = all_ids(&["src/model.ts", "src/a.ts", "src/b.ts", "src/c.ts"]);
    let layers = compute_topo_layers(&sibling_cycle_graph(), &changed);
    assert_eq!(
        layer_ids(&layers),
        vec![
            vec!["src/model.ts"],
            vec!["src/a.ts", "src/b.ts", "src/c.ts"]
        ]
    );
    assert!(!layers[0].cyclic);
    assert!(layers[1].cyclic);
    assert_eq!(layers[1].depends_on_layers, vec![0]);
}

#[test]
fn module_depending_on_a_cycle_sits_in_the_next_layer() {
    let changed = all_ids(&[
        "src/model.ts",
        "src/a.ts",
        "src/b.ts",
        "src/c.ts",
        "src/d.ts",
    ]);
    let layers = compute_topo_layers(&sibling_cycle_graph(), &changed);
    assert_eq!(layers.len(), 3);
    assert_eq!(layers[2].module_ids, vec!["src/d.ts"]);
    assert_eq!(layers[2].depends_on_layers, vec![1]);
    assert!(!layers[2].cyclic);
}
