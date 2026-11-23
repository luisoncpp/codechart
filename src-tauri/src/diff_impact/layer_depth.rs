// @Architecture(descriptionShort="Longest-path layer depth over the SCC condensation of changed-module deps")
use crate::references::find_cycle_sccs;
use std::collections::{BTreeMap, BTreeSet, HashMap};

/// Layer index per module, plus the modules that sit in a multi-module cycle.
pub struct LayerAssignment {
    pub layer_of: HashMap<String, usize>,
    pub cyclic: BTreeSet<String>,
}

/// Collapse each import cycle (SCC) into one node and layer every node at its
/// longest-path depth in the resulting DAG, so a layer depends only on earlier
/// layers and a cycle is never split across layers.
pub fn assign_layers(deps: &BTreeMap<String, BTreeSet<String>>) -> LayerAssignment {
    let (comp_of, cyclic) = component_map(deps);
    let comp_deps = condense(deps, &comp_of);
    let mut depth: HashMap<String, usize> = HashMap::new();
    for comp in comp_deps.keys() {
        comp_depth(comp, &comp_deps, &mut depth);
    }
    let layer_of = comp_of
        .iter()
        .map(|(id, comp)| (id.clone(), depth.get(comp).copied().unwrap_or(0)))
        .collect();
    LayerAssignment { layer_of, cyclic }
}

/// Module -> component representative (first sorted SCC member, or itself).
fn component_map(
    deps: &BTreeMap<String, BTreeSet<String>>,
) -> (BTreeMap<String, String>, BTreeSet<String>) {
    let mut comp_of: BTreeMap<String, String> =
        deps.keys().map(|id| (id.clone(), id.clone())).collect();
    let mut cyclic = BTreeSet::new();
    for scc in find_cycle_sccs(deps) {
        let rep = scc[0].clone();
        for id in scc {
            comp_of.insert(id.clone(), rep.clone());
            cyclic.insert(id);
        }
    }
    (comp_of, cyclic)
}

fn condense(
    deps: &BTreeMap<String, BTreeSet<String>>,
    comp_of: &BTreeMap<String, String>,
) -> BTreeMap<String, BTreeSet<String>> {
    let mut out: BTreeMap<String, BTreeSet<String>> = comp_of
        .values()
        .map(|comp| (comp.clone(), BTreeSet::new()))
        .collect();
    for (source, targets) in deps {
        let from = &comp_of[source];
        for target in targets {
            let to = &comp_of[target];
            if to == from {
                continue;
            }
            if let Some(set) = out.get_mut(from) {
                set.insert(to.clone());
            }
        }
    }
    out
}

fn comp_depth(
    comp: &str,
    comp_deps: &BTreeMap<String, BTreeSet<String>>,
    memo: &mut HashMap<String, usize>,
) -> usize {
    if let Some(&known) = memo.get(comp) {
        return known;
    }
    let depth = comp_deps
        .get(comp)
        .into_iter()
        .flatten()
        .map(|dep| comp_depth(dep, comp_deps, memo) + 1)
        .max()
        .unwrap_or(0);
    memo.insert(comp.to_string(), depth);
    depth
}
