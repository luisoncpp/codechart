// @Architecture(descriptionShort="Flags import cycles as circularDependency diagnostics")

use std::collections::{BTreeMap, BTreeSet};

use crate::contract::{Diagnostic, DiagnosticKind, Edge, EdgeKind, Severity};

use super::cpp::{is_pair_self_edge, is_paired_cpp_header};

/// Flag import-cycle edges and emit `circularDependency` diagnostics per cycled unit.
pub fn flag_cycles(edges: &mut [Edge], module_ids: &[String]) -> Vec<Diagnostic> {
    let import_indices: Vec<usize> = edges
        .iter()
        .enumerate()
        .filter(|(_, e)| e.kind == EdgeKind::Import)
        .map(|(i, _)| i)
        .collect();
    let units = unit_map(module_ids, edges, &import_indices);
    let unit_edges = project_unit_edges(edges, &import_indices, &units);
    let sccs = find_cycle_sccs(&unit_edges.adj);
    let mut diagnostics = Vec::new();
    for scc in sccs {
        let members: BTreeSet<String> = scc.iter().cloned().collect();
        let witness = witness_cycle(&members, &unit_edges.adj);
        let cycle_key = cycle_key(&members);
        let message = cycle_message(&witness, &members);
        flag_scc_edges(edges, &import_indices, &units, &members);
        emit_scc_diagnostics(
            &mut diagnostics,
            module_ids,
            &units,
            &members,
            &cycle_key,
            &message,
            edges,
            &import_indices,
        );
    }
    diagnostics
}

struct UnitEdges {
    adj: BTreeMap<String, BTreeSet<String>>,
}

struct ProjectedEdge {
    unit_source: String,
    unit_target: String,
    is_pair_self: bool,
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

fn project_unit_edges(
    edges: &[Edge],
    import_indices: &[usize],
    units: &BTreeMap<String, String>,
) -> UnitEdges {
    let mut adj: BTreeMap<String, BTreeSet<String>> = BTreeMap::new();
    for i in import_indices {
        let edge = &edges[*i];
        let projected = project_edge(edge, units);
        if projected.is_pair_self {
            continue;
        }
        adj.entry(projected.unit_source.clone())
            .or_default()
            .insert(projected.unit_target.clone());
    }
    UnitEdges { adj }
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
        is_pair_self: is_pair_self_edge(&edge.source, &edge.target),
    }
}

fn find_cycle_sccs(adj: &BTreeMap<String, BTreeSet<String>>) -> Vec<Vec<String>> {
    let mut nodes: BTreeSet<String> = BTreeSet::new();
    for (src, dsts) in adj {
        nodes.insert(src.clone());
        for dst in dsts {
            nodes.insert(dst.clone());
        }
    }
    let mut index = 0;
    let mut stack = Vec::new();
    let mut on_stack = BTreeSet::new();
    let mut indices: BTreeMap<String, usize> = BTreeMap::new();
    let mut lowlink: BTreeMap<String, usize> = BTreeMap::new();
    let mut sccs = Vec::new();
    for node in &nodes {
        if !indices.contains_key(node) {
            tarjan(
                node,
                adj,
                &mut index,
                &mut stack,
                &mut on_stack,
                &mut indices,
                &mut lowlink,
                &mut sccs,
            );
        }
    }
    sccs.retain(|scc| is_reportable_scc(scc, adj));
    sccs
}

fn is_reportable_scc(scc: &[String], adj: &BTreeMap<String, BTreeSet<String>>) -> bool {
    if scc.len() >= 2 {
        return true;
    }
    let unit = &scc[0];
    adj.get(unit).is_some_and(|dsts| dsts.contains(unit))
}

fn tarjan(
    node: &String,
    adj: &BTreeMap<String, BTreeSet<String>>,
    index: &mut usize,
    stack: &mut Vec<String>,
    on_stack: &mut BTreeSet<String>,
    indices: &mut BTreeMap<String, usize>,
    lowlink: &mut BTreeMap<String, usize>,
    sccs: &mut Vec<Vec<String>>,
) {
    indices.insert(node.clone(), *index);
    lowlink.insert(node.clone(), *index);
    *index += 1;
    stack.push(node.clone());
    on_stack.insert(node.clone());
    for neighbor in adj.get(node).into_iter().flat_map(|s| s.iter()) {
        if !indices.contains_key(neighbor) {
            tarjan(neighbor, adj, index, stack, on_stack, indices, lowlink, sccs);
            let link = lowlink.get(neighbor).copied().unwrap_or(0);
            let node_link = lowlink.get(node).copied().unwrap_or(0);
            lowlink.insert(node.clone(), node_link.min(link));
        } else if on_stack.contains(neighbor) {
            let neighbor_idx = indices.get(neighbor).copied().unwrap_or(0);
            let node_link = lowlink.get(node).copied().unwrap_or(0);
            lowlink.insert(node.clone(), node_link.min(neighbor_idx));
        }
    }
    if lowlink.get(node).copied() == indices.get(node).copied() {
        let mut scc = Vec::new();
        loop {
            let popped = stack.pop().expect("tarjan stack");
            let done = popped == *node;
            on_stack.remove(&popped);
            scc.push(popped);
            if done {
                break;
            }
        }
        scc.sort();
        sccs.push(scc);
    }
}

fn witness_cycle(members: &BTreeSet<String>, adj: &BTreeMap<String, BTreeSet<String>>) -> Vec<String> {
    let start = members.iter().next().expect("non-empty scc").clone();
    if members.len() == 1 {
        return vec![start.clone(), start.clone()];
    }
    let mut path = vec![start.clone()];
    let mut current = start.clone();
    while path.len() <= members.len() + 1 {
        let prev = if path.len() > 1 {
            Some(path[path.len() - 2].as_str())
        } else {
            None
        };
        let next = next_witness_step(&current, prev, members, adj);
        match next {
            Some(n) if n == start && path.len() > 1 => {
                path.push(start.clone());
                return path;
            }
            Some(n) => {
                path.push(n.clone());
                current = n;
            }
            None => break,
        }
    }
    path.push(start.clone());
    path
}

fn next_witness_step(
    current: &str,
    prev: Option<&str>,
    members: &BTreeSet<String>,
    adj: &BTreeMap<String, BTreeSet<String>>,
) -> Option<String> {
    adj.get(current)
        .into_iter()
        .flat_map(|s| s.iter())
        .filter(|n| members.contains(n.as_str()))
        .filter(|n| prev.map(|p| n.as_str() != p).unwrap_or(true))
        .min()
        .cloned()
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

fn flag_scc_edges(
    edges: &mut [Edge],
    import_indices: &[usize],
    units: &BTreeMap<String, String>,
    members: &BTreeSet<String>,
) {
    for i in import_indices {
        let edge = &mut edges[*i];
        let projected = project_edge(edge, units);
        if projected.is_pair_self {
            continue;
        }
        if members.contains(&projected.unit_source) && members.contains(&projected.unit_target) {
            edge.is_violation = true;
        }
    }
}

fn emit_scc_diagnostics(
    diagnostics: &mut Vec<Diagnostic>,
    module_ids: &[String],
    units: &BTreeMap<String, String>,
    members: &BTreeSet<String>,
    cycle_key: &str,
    message: &str,
    edges: &[Edge],
    import_indices: &[usize],
) {
    for file in module_ids {
        let unit = units.get(file).cloned().unwrap_or_else(|| file.clone());
        if !members.contains(&unit) {
            continue;
        }
        let edge_id = witness_edge_for_file(file, edges, import_indices, units, members);
        diagnostics.push(Diagnostic {
            id: format!("circularDependency:{cycle_key}:{file}"),
            severity: Severity::Warning,
            kind: DiagnosticKind::CircularDependency,
            message: message.to_string(),
            module_id: Some(file.clone()),
            edge_id,
            unresolved_target: None,
        });
    }
}

fn witness_edge_for_file(
    file: &str,
    edges: &[Edge],
    import_indices: &[usize],
    units: &BTreeMap<String, String>,
    members: &BTreeSet<String>,
) -> Option<String> {
    for i in import_indices {
        let edge = &edges[*i];
        if edge.source != file {
            continue;
        }
        let projected = project_edge(edge, units);
        if projected.is_pair_self {
            continue;
        }
        if members.contains(&projected.unit_source) && members.contains(&projected.unit_target) {
            return Some(edge.id.clone());
        }
    }
    None
}
