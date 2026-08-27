// @Architecture(descriptionShort="Tarjan SCC detection for import-cycle units")

use std::collections::{BTreeMap, BTreeSet};

pub fn find_cycle_sccs(adj: &BTreeMap<String, BTreeSet<String>>) -> Vec<Vec<String>> {
    let nodes = collect_adj_nodes(adj);
    let mut state = TarjanState::new(adj);
    for node in &nodes {
        if !state.indices.contains_key(node) {
            tarjan(node, &mut state);
        }
    }
    state.sccs.retain(|scc| is_reportable_scc(scc, adj));
    state.sccs
}

struct TarjanState<'a> {
    adj: &'a BTreeMap<String, BTreeSet<String>>,
    index: usize,
    stack: Vec<String>,
    on_stack: BTreeSet<String>,
    indices: BTreeMap<String, usize>,
    lowlink: BTreeMap<String, usize>,
    sccs: Vec<Vec<String>>,
}

impl<'a> TarjanState<'a> {
    fn new(adj: &'a BTreeMap<String, BTreeSet<String>>) -> Self {
        Self {
            adj,
            index: 0,
            stack: Vec::new(),
            on_stack: BTreeSet::new(),
            indices: BTreeMap::new(),
            lowlink: BTreeMap::new(),
            sccs: Vec::new(),
        }
    }
}

fn collect_adj_nodes(adj: &BTreeMap<String, BTreeSet<String>>) -> BTreeSet<String> {
    let mut nodes = BTreeSet::new();
    for (src, dsts) in adj {
        nodes.insert(src.clone());
        for dst in dsts {
            nodes.insert(dst.clone());
        }
    }
    nodes
}

fn is_reportable_scc(scc: &[String], adj: &BTreeMap<String, BTreeSet<String>>) -> bool {
    if scc.len() >= 2 {
        return true;
    }
    let unit = &scc[0];
    adj.get(unit).is_some_and(|dsts| dsts.contains(unit))
}

fn tarjan(node: &String, state: &mut TarjanState) {
    enter_tarjan(node, state);
    for neighbor in state.adj.get(node).into_iter().flat_map(|s| s.iter()) {
        visit_neighbor(node, neighbor, state);
    }
    finish_tarjan(node, state);
}

fn enter_tarjan(node: &String, state: &mut TarjanState) {
    state.indices.insert(node.clone(), state.index);
    state.lowlink.insert(node.clone(), state.index);
    state.index += 1;
    state.stack.push(node.clone());
    state.on_stack.insert(node.clone());
}

fn visit_neighbor(node: &String, neighbor: &String, state: &mut TarjanState) {
    if !state.indices.contains_key(neighbor) {
        tarjan(neighbor, state);
        merge_lowlink(
            node,
            state.lowlink.get(neighbor).copied().unwrap_or(0),
            state,
        );
        return;
    }
    if state.on_stack.contains(neighbor) {
        let idx = state.indices.get(neighbor).copied().unwrap_or(0);
        merge_lowlink(node, idx, state);
    }
}

fn merge_lowlink(node: &String, link: usize, state: &mut TarjanState) {
    let node_link = state.lowlink.get(node).copied().unwrap_or(0);
    state.lowlink.insert(node.clone(), node_link.min(link));
}

fn finish_tarjan(node: &String, state: &mut TarjanState) {
    if state.lowlink.get(node).copied() != state.indices.get(node).copied() {
        return;
    }
    pop_scc(node, state);
}

fn pop_scc(node: &String, state: &mut TarjanState) {
    let mut scc = Vec::new();
    loop {
        let popped = state.stack.pop().expect("tarjan stack");
        let done = popped == *node;
        state.on_stack.remove(&popped);
        scc.push(popped);
        if done {
            break;
        }
    }
    scc.sort();
    state.sccs.push(scc);
}
