// @Architecture(descriptionShort="Output types for diff impact analysis")
use crate::contract::Diagnostic;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TopoLayer {
    pub index: usize,
    pub module_ids: Vec<String>,
    pub depends_on_layers: Vec<usize>,
    pub group_ids: Vec<String>,
    /// True when the layer holds a multi-module import cycle (one SCC).
    pub cyclic: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BlastRadiusEntry {
    pub module_id: String,
    pub depth: usize,
    pub group_id: Option<String>,
    pub via_module_ids: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiffImpactReport {
    pub changed_module_ids: Vec<String>,
    pub layers: Vec<TopoLayer>,
    pub blast_radius: Vec<BlastRadiusEntry>,
    pub affected_group_ids: Vec<String>,
    pub new_diagnostics: Vec<Diagnostic>,
}
