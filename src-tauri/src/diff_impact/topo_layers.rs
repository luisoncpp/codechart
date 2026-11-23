// @Architecture(descriptionShort="Foundation-first topological layering of changed modules")
use super::layer_depth::{assign_layers, LayerAssignment};
use super::types::TopoLayer;
use crate::contract::{EdgeKind, ProjectGraph};
use crate::references::is_paired_rust_parent_child;
use std::collections::{BTreeMap, BTreeSet, HashMap, HashSet};

/// Partition `changed_ids` into dependency-ordered layers:
/// Layer 0 has no dependencies on other changed modules (foundation);
/// Layer K depends only on layers < K. A multi-module import cycle (SCC) is one
/// `cyclic` layer at its longest-path depth.
pub fn compute_topo_layers(graph: &ProjectGraph, changed_ids: &[String]) -> Vec<TopoLayer> {
    let changed_set: HashSet<&str> = changed_ids.iter().map(String::as_str).collect();
    if changed_set.is_empty() {
        return Vec::new();
    }
    let deps = build_changed_deps(graph, &changed_set);
    let assignment = assign_layers(&deps);
    assemble_layers(graph, &deps, &assignment)
}

/// Map module -> set of changed modules it imports (depends on). Skips the
/// Rust `mod child;` / `use super::` parent<->child edges, exactly like cycle
/// detection: every Rust module tree would otherwise be one big cycle.
fn build_changed_deps<'a>(
    graph: &'a ProjectGraph,
    changed: &HashSet<&'a str>,
) -> BTreeMap<String, BTreeSet<String>> {
    let mut deps: BTreeMap<String, BTreeSet<String>> = changed
        .iter()
        .map(|id| ((*id).to_string(), BTreeSet::new()))
        .collect();
    for edge in &graph.edges {
        if edge.kind != EdgeKind::Import || edge.source == edge.target {
            continue;
        }
        if is_paired_rust_parent_child(&edge.source, &edge.target) {
            continue;
        }
        if changed.contains(edge.source.as_str()) && changed.contains(edge.target.as_str()) {
            if let Some(set) = deps.get_mut(&edge.source) {
                set.insert(edge.target.clone());
            }
        }
    }
    deps
}

fn assemble_layers(
    graph: &ProjectGraph,
    deps: &BTreeMap<String, BTreeSet<String>>,
    assignment: &LayerAssignment,
) -> Vec<TopoLayer> {
    let layer_of = &assignment.layer_of;
    let group_of: HashMap<&str, Option<&str>> = graph
        .modules
        .iter()
        .map(|m| (m.id.as_str(), m.group_id.as_deref()))
        .collect();
    let mut grouped: BTreeMap<usize, Vec<String>> = BTreeMap::new();
    for (id, &idx) in layer_of {
        grouped.entry(idx).or_default().push(id.clone());
    }
    grouped
        .into_iter()
        .map(|(index, mut module_ids)| {
            module_ids.sort();
            let depends_on_layers = collect_dep_layers(&module_ids, index, deps, layer_of);
            let group_ids = collect_group_ids(&module_ids, &group_of);
            let cyclic = module_ids.iter().any(|id| assignment.cyclic.contains(id));
            TopoLayer {
                index,
                module_ids,
                depends_on_layers,
                group_ids,
                cyclic,
            }
        })
        .collect()
}

fn collect_dep_layers(
    module_ids: &[String],
    index: usize,
    deps: &BTreeMap<String, BTreeSet<String>>,
    layer_of: &HashMap<String, usize>,
) -> Vec<usize> {
    let mut set = BTreeSet::new();
    for id in module_ids {
        if let Some(d_set) = deps.get(id) {
            for dep in d_set {
                if let Some(&dep_layer) = layer_of.get(dep) {
                    if dep_layer < index {
                        set.insert(dep_layer);
                    }
                }
            }
        }
    }
    set.into_iter().collect()
}

fn collect_group_ids(module_ids: &[String], group_of: &HashMap<&str, Option<&str>>) -> Vec<String> {
    let mut set = BTreeSet::new();
    for id in module_ids {
        if let Some(Some(gid)) = group_of.get(id.as_str()) {
            set.insert((*gid).to_string());
        }
    }
    set.into_iter().collect()
}
