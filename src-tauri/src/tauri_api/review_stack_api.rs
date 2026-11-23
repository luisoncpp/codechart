// @Architecture(descriptionShort="Tauri IPC commands for Review Stacks, diff impact analysis, and MCP bridge replies")
use crate::contract::ProjectGraph;
use crate::diff_impact::{
    analyze_diff_impact as run_diff_impact, compute_blast_radius as run_blast_radius,
    BlastRadiusEntry, DiffImpactInput, DiffImpactReport, DEFAULT_BLAST_DEPTH,
};
use crate::mcp_bridge::McpBridgeState;
use crate::review_stacks::{
    clear_review_stacks as clear_stacks, delete_review_stack as delete_stack,
    load_review_stack as load_stack, save_review_stack as save_stack, ReviewStackRecord,
};
use std::sync::Arc;

#[tauri::command(async)]
pub fn load_review_stack(root: String, diff_id: String) -> Result<Option<ReviewStackRecord>, String> {
    load_stack(&root, &diff_id)
}

#[tauri::command(async)]
pub fn save_review_stack(root: String, stack: ReviewStackRecord) -> Result<(), String> {
    save_stack(&root, stack)
}

#[tauri::command(async)]
pub fn delete_review_stack(root: String, diff_id: String) -> Result<(), String> {
    delete_stack(&root, &diff_id)
}

#[tauri::command(async)]
pub fn clear_review_stacks(root: String) -> Result<(), String> {
    clear_stacks(&root)
}

#[tauri::command(async)]
pub fn analyze_diff_impact(
    before: Option<ProjectGraph>,
    after: ProjectGraph,
    changed_module_ids: Vec<String>,
    max_depth: Option<usize>,
) -> DiffImpactReport {
    run_diff_impact(DiffImpactInput {
        before: before.as_ref(),
        after: &after,
        changed_module_ids: &changed_module_ids,
        max_depth: max_depth.unwrap_or(DEFAULT_BLAST_DEPTH),
    })
}

#[tauri::command(async)]
pub fn compute_module_blast_radius(
    graph: ProjectGraph,
    seed_ids: Vec<String>,
    max_depth: Option<usize>,
) -> (Vec<BlastRadiusEntry>, Vec<String>) {
    run_blast_radius(&graph, &seed_ids, max_depth.unwrap_or(DEFAULT_BLAST_DEPTH))
}

/// Synchronous by design — delivers an in-memory reply to a waiting MCP HTTP thread.
#[tauri::command]
pub fn mcp_bridge_respond(
    state: tauri::State<'_, Arc<McpBridgeState>>,
    id: String,
    result: Option<serde_json::Value>,
    error: Option<String>,
) -> bool {
    state.resolve(&id, result, error)
}
