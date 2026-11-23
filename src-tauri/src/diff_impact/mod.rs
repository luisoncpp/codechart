// @Architecture(descriptionShort="Diff impact engine facade: topo layers, blast radius, delta diagnostics")
mod blast_radius;
mod delta_diagnostics;
mod layer_depth;
mod topo_layers;
mod types;

pub use blast_radius::compute_blast_radius;
pub use delta_diagnostics::compute_delta_diagnostics;
pub use topo_layers::compute_topo_layers;
pub use types::{BlastRadiusEntry, DiffImpactReport, TopoLayer};

use crate::contract::ProjectGraph;

pub const DEFAULT_BLAST_DEPTH: usize = 3;

pub struct DiffImpactInput<'a> {
    pub before: Option<&'a ProjectGraph>,
    pub after: &'a ProjectGraph,
    pub changed_module_ids: &'a [String],
    pub max_depth: usize,
}

pub fn analyze_diff_impact(input: DiffImpactInput<'_>) -> DiffImpactReport {
    let mut changed = input.changed_module_ids.to_vec();
    changed.sort();
    changed.dedup();
    let layers = compute_topo_layers(input.after, &changed);
    let (blast_radius, affected_group_ids) =
        compute_blast_radius(input.after, &changed, input.max_depth);
    let new_diagnostics = compute_delta_diagnostics(input.before, input.after);
    DiffImpactReport {
        changed_module_ids: changed,
        layers,
        blast_radius,
        affected_group_ids,
        new_diagnostics,
    }
}

#[cfg(test)]
mod layer_tests;
#[cfg(test)]
mod tests;
