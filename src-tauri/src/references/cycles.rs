// @Architecture(descriptionShort="Flags import cycles as circularDependency diagnostics")

use std::collections::{BTreeMap, BTreeSet};

use crate::contract::{Diagnostic, DiagnosticKind, Edge, EdgeKind, Severity};

use super::cpp::is_paired_cpp_header;
use super::cycle_scc::{find_cycle_sccs, witness_cycle};

/// Flag import-cycle edges and emit `circularDependency` diagnostics per cycled unit.
pub fn flag_cycles(edges: &mut [Edge], module_ids: &[String]) -> Vec<Diagnostic> {
    let import_indices = import_edge_indices(edges);
    let units = unit_map(module_ids, edges, &import_indices);
    let adj = unit_adjacency(edges, &import_indices, &units);
    let mut diagnostics = Vec::new();
    let mut graph = CycleGraph {
        edges,
        import_indices: &import_indices,
        units: &units,
    };
    for scc in find_cycle_sccs(&adj) {
        let members: BTreeSet<String> = scc.iter().cloned().collect();
        let witness = witness_cycle(&members, &adj);
        let key = cycle_key(&members);
        let message = cycle_message(&witness, &members);
        flag_scc_edges(&mut graph, &members);
        let emit = SccEmit {
            module_ids,
            graph: &graph,
            members: &members,
            cycle_key: &key,
            message: &message,
        };
        emit_scc_diagnostics(&mut diagnostics, &emit);
    }
    diagnostics
}

fn cycle_key(members: &BTreeSet<String>) -> String {
    members.iter().cloned().collect::<Vec<_>>().join(",")
}

fn cycle_message(witness: &[String], members: &BTreeSet<String>) -> String {
    let chain = witness.join(" → ");
    let extras: Vec<&String> = members
        .iter()
        .filter(|m| !witness.contains(m))
        .collect();
    if extras.is_empty() {
        return format!("circular include: {chain}");
    }
    let also = extras
        .iter()
        .map(|s| s.as_str())
        .collect::<Vec<_>>()
        .join(", ");
    format!("circular include: {chain} (also {also})")
}

struct CycleGraph<'a> {
    edges: &'a mut [Edge],
    import_indices: &'a [usize],
    units: &'a BTreeMap<String, String>,
}

struct SccEmit<'a> {
    module_ids: &'a [String],
    graph: &'a CycleGraph<'a>,
    members: &'a BTreeSet<String>,
    cycle_key: &'a str,
    message: &'a str,
}

struct ProjectedEdge {
    unit_source: String,
    unit_target: String,
    is_pair_self: bool,
}

fn import_edge_indices(edges: &[Edge]) -> Vec<usize> {
    edges
        .iter()
        .enumerate()
        .filter(|(_, e)| e.kind == EdgeKind::Import)
        .map(|(i, _)| i)
        .collect()
}

fn unit_map(
    module_ids: &[String],
    edges: &[Edge],
    import_indices: &[usize],
) -> BTreeMap<String, String> {
    let mut units: BTreeMap<String, String> = BTreeMap::new();
    for id in module_ids {
        units.insert(id.clone(), id.clone());
    }
    for i in import_indices {
        let edge = &edges[*i];
        if is_paired_cpp_header(&edge.source, &edge.target) {
            units.insert(edge.source.clone(), edge.target.clone());
        }
    }
    units
}

fn unit_adjacency(
    edges: &[Edge],
    import_indices: &[usize],
    units: &BTreeMap<String, String>,
) -> BTreeMap<String, BTreeSet<String>> {
    let mut adj: BTreeMap<String, BTreeSet<String>> = BTreeMap::new();
    for i in import_indices {
        let projected = project_edge(&edges[*i], units);
        if projected.is_pair_self {
            continue;
        }
        adj.entry(projected.unit_source.clone())
            .or_default()
            .insert(projected.unit_target.clone());
    }
    adj
}

fn project_edge(edge: &Edge, units: &BTreeMap<String, String>) -> ProjectedEdge {
    let unit_source = units
        .get(&edge.source)
        .cloned()
        .unwrap_or_else(|| edge.source.clone());
    let unit_target = units
        .get(&edge.target)
        .cloned()
        .unwrap_or_else(|| edge.target.clone());
    ProjectedEdge {
        unit_source,
        unit_target,
        is_pair_self: is_paired_cpp_header(&edge.source, &edge.target),
    }
}

fn flag_scc_edges(graph: &mut CycleGraph, members: &BTreeSet<String>) {
    for i in graph.import_indices {
        let edge = &mut graph.edges[*i];
        let projected = project_edge(edge, graph.units);
        if projected.is_pair_self {
            continue;
        }
        if members.contains(&projected.unit_source) && members.contains(&projected.unit_target) {
            edge.is_violation = true;
        }
    }
}

fn emit_scc_diagnostics(diagnostics: &mut Vec<Diagnostic>, emit: &SccEmit) {
    for file in emit.module_ids {
        let unit = emit
            .graph
            .units
            .get(file)
            .cloned()
            .unwrap_or_else(|| file.clone());
        if !emit.members.contains(&unit) {
            continue;
        }
        let edge_id = witness_edge_for_file(emit.graph, file, emit.members);
        diagnostics.push(Diagnostic {
            id: format!("circularDependency:{}:{}", emit.cycle_key, file),
            severity: Severity::Warning,
            kind: DiagnosticKind::CircularDependency,
            message: emit.message.to_string(),
            module_id: Some(file.clone()),
            edge_id,
            unresolved_target: None,
        });
    }
}

fn witness_edge_for_file(
    graph: &CycleGraph,
    file: &str,
    members: &BTreeSet<String>,
) -> Option<String> {
    for i in graph.import_indices {
        let edge = &graph.edges[*i];
        if edge.source != file {
            continue;
        }
        let projected = project_edge(edge, graph.units);
        if projected.is_pair_self {
            continue;
        }
        if members.contains(&projected.unit_source) && members.contains(&projected.unit_target) {
            return Some(edge.id.clone());
        }
    }
    None
}
