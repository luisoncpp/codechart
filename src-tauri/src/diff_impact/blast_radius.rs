// @Architecture(descriptionShort="Reverse-BFS transitive blast radius over ProjectGraph edges")
use super::types::BlastRadiusEntry;
use crate::contract::ProjectGraph;
use std::collections::{BTreeMap, BTreeSet, HashMap, HashSet, VecDeque};

/// Compute downstream modules that depend (directly or transitively) on `seed_ids`.
/// Seed modules themselves are excluded (they are depth 0); returned entries have depth 1..=max_depth.
pub fn compute_blast_radius(
    graph: &ProjectGraph,
    seed_ids: &[String],
    max_depth: usize,
) -> (Vec<BlastRadiusEntry>, Vec<String>) {
    if seed_ids.is_empty() || max_depth == 0 {
        return (Vec::new(), Vec::new());
    }
    let reverse_adj = build_reverse_adjacency(graph);
    let group_of: HashMap<&str, Option<&str>> = graph
        .modules
        .iter()
        .map(|m| (m.id.as_str(), m.group_id.as_deref()))
        .collect();
    let (depths, via) = bfs_reverse(&reverse_adj, seed_ids, max_depth);
    let mut entries = build_entries(&depths, &via, &group_of);
    entries.sort_by(|a, b| a.depth.cmp(&b.depth).then_with(|| a.module_id.cmp(&b.module_id)));
    let affected_groups = collect_affected_groups(seed_ids, &entries, &group_of);
    (entries, affected_groups)
}

fn build_reverse_adjacency(graph: &ProjectGraph) -> HashMap<&str, Vec<&str>> {
    let mut rev: HashMap<&str, Vec<&str>> = HashMap::new();
    for edge in &graph.edges {
        if edge.source != edge.target {
            rev.entry(edge.target.as_str()).or_default().push(edge.source.as_str());
        }
    }
    rev
}

fn bfs_reverse(
    rev: &HashMap<&str, Vec<&str>>,
    seeds: &[String],
    max_depth: usize,
) -> (BTreeMap<String, usize>, HashMap<String, BTreeSet<String>>) {
    let seed_set: HashSet<&str> = seeds.iter().map(String::as_str).collect();
    let mut depths: BTreeMap<String, usize> = BTreeMap::new();
    let mut via: HashMap<String, BTreeSet<String>> = HashMap::new();
    let mut queue: VecDeque<(String, usize)> = VecDeque::new();

    for seed in seeds {
        queue.push_back((seed.clone(), 0));
    }
    while let Some((current, depth)) = queue.pop_front() {
        if depth >= max_depth {
            continue;
        }
        let Some(dependents) = rev.get(current.as_str()) else {
            continue;
        };
        for &dep in dependents {
            if seed_set.contains(dep) {
                continue;
            }
            let next_depth = depth + 1;
            match depths.get(dep) {
                None => {
                    depths.insert(dep.to_string(), next_depth);
                    via.entry(dep.to_string()).or_default().insert(current.clone());
                    queue.push_back((dep.to_string(), next_depth));
                }
                Some(&existing) if existing == next_depth => {
                    via.entry(dep.to_string()).or_default().insert(current.clone());
                }
                _ => {}
            }
        }
    }
    (depths, via)
}

fn build_entries(
    depths: &BTreeMap<String, usize>,
    via: &HashMap<String, BTreeSet<String>>,
    group_of: &HashMap<&str, Option<&str>>,
) -> Vec<BlastRadiusEntry> {
    depths
        .iter()
        .map(|(module_id, &depth)| BlastRadiusEntry {
            module_id: module_id.clone(),
            depth,
            group_id: group_of.get(module_id.as_str()).and_then(|g| g.map(str::to_string)),
            via_module_ids: via.get(module_id).map(|s| s.iter().cloned().collect()).unwrap_or_default(),
        })
        .collect()
}

fn collect_affected_groups(
    seeds: &[String],
    entries: &[BlastRadiusEntry],
    group_of: &HashMap<&str, Option<&str>>,
) -> Vec<String> {
    let mut set = BTreeSet::new();
    for seed in seeds {
        if let Some(Some(gid)) = group_of.get(seed.as_str()) {
            set.insert((*gid).to_string());
        }
    }
    for entry in entries {
        if let Some(gid) = &entry.group_id {
            set.insert(gid.clone());
        }
    }
    set.into_iter().collect()
}
