// @Architecture(descriptionShort="Tarjan SCC and canonical cycle witnesses for import cycles")

use std::collections::{BTreeMap, BTreeSet};

pub fn find_cycle_sccs(adj: &BTreeMap<String, BTreeSet<String>>) -> Vec<Vec<String>> {
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

pub fn witness_cycle(
    members: &BTreeSet<String>,
    adj: &BTreeMap<String, BTreeSet<String>>,
) -> Vec<String> {
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

pub fn cycle_key(members: &BTreeSet<String>) -> String {
    members.iter().cloned().collect::<Vec<_>>().join(",")
}

pub fn cycle_message(witness: &[String], members: &BTreeSet<String>) -> String {
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
