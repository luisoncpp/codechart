// @Architecture(descriptionShort="Hub-shortest elementary cycle witness for an import SCC")

use std::collections::{BTreeMap, BTreeSet, VecDeque};

/// Shortest elementary cycle through the highest-degree SCC member (lex tie-break).
pub fn witness_cycle(
    members: &BTreeSet<String>,
    adj: &BTreeMap<String, BTreeSet<String>>,
) -> Vec<String> {
    let graph = SccView { members, adj };
    let hub = graph.pick_hub();
    if members.len() == 1 {
        return vec![hub.clone(), hub];
    }
    graph
        .shortest_through(&hub)
        .unwrap_or_else(|| vec![hub.clone(), hub])
}

struct SccView<'a> {
    members: &'a BTreeSet<String>,
    adj: &'a BTreeMap<String, BTreeSet<String>>,
}

impl SccView<'_> {
    fn pick_hub(&self) -> String {
        let mut best: Option<&String> = None;
        let mut best_deg = 0usize;
        for member in self.members {
            let deg = self.degree(member);
            let replace = match best {
                None => true,
                Some(prev) => deg > best_deg || (deg == best_deg && member < prev),
            };
            if !replace {
                continue;
            }
            best = Some(member);
            best_deg = deg;
        }
        best.expect("non-empty scc").clone()
    }

    fn degree(&self, node: &str) -> usize {
        let out = self.neighbors(node).len();
        let inn = self
            .members
            .iter()
            .filter(|m| m.as_str() != node)
            .filter(|m| self.adj.get(m.as_str()).is_some_and(|s| s.contains(node)))
            .count();
        out + inn
    }

    fn shortest_through(&self, hub: &str) -> Option<Vec<String>> {
        let mut best: Option<Vec<String>> = None;
        for succ in self.neighbors(hub) {
            if succ == hub {
                return Some(vec![hub.to_string(), hub.to_string()]);
            }
            let Some(tail) = self.bfs_path(&succ, hub) else {
                continue;
            };
            let mut cycle = vec![hub.to_string()];
            cycle.extend(tail);
            if cycle_is_better(&cycle, &best) {
                best = Some(cycle);
            }
        }
        best
    }

    fn bfs_path(&self, start: &str, target: &str) -> Option<Vec<String>> {
        if start == target {
            return Some(vec![start.to_string()]);
        }
        let mut queue = VecDeque::from([start.to_string()]);
        let mut parent = BTreeMap::new();
        let mut seen = BTreeSet::from([start.to_string()]);
        while let Some(cur) = queue.pop_front() {
            for next in self.neighbors(&cur) {
                if !seen.insert(next.clone()) {
                    continue;
                }
                parent.insert(next.clone(), cur.clone());
                if next == target {
                    return Some(reconstruct_path(start, target, &parent));
                }
                queue.push_back(next);
            }
        }
        None
    }

    fn neighbors(&self, node: &str) -> Vec<String> {
        self.adj
            .get(node)
            .into_iter()
            .flat_map(|s| s.iter())
            .filter(|n| self.members.contains(n.as_str()))
            .cloned()
            .collect()
    }
}

fn cycle_is_better(cycle: &[String], best: &Option<Vec<String>>) -> bool {
    let Some(current) = best else {
        return true;
    };
    if cycle.len() != current.len() {
        return cycle.len() < current.len();
    }
    cycle < current.as_slice()
}

fn reconstruct_path(
    start: &str,
    target: &str,
    parent: &BTreeMap<String, String>,
) -> Vec<String> {
    let mut path = vec![target.to_string()];
    let mut cur = target;
    while cur != start {
        cur = parent.get(cur).expect("bfs parent");
        path.push(cur.to_string());
    }
    path.reverse();
    path
}
