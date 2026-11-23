// @Architecture(descriptionShort="Computes newly introduced architecture diagnostics between before and after graphs")
use crate::contract::{Diagnostic, ProjectGraph};
use std::collections::HashSet;

pub fn compute_delta_diagnostics(
    before: Option<&ProjectGraph>,
    after: &ProjectGraph,
) -> Vec<Diagnostic> {
    let Some(before_graph) = before else {
        return Vec::new();
    };
    let existing: HashSet<String> = before_graph
        .diagnostics
        .iter()
        .map(diagnostic_key)
        .collect();
    after
        .diagnostics
        .iter()
        .filter(|d| !existing.contains(&diagnostic_key(d)))
        .cloned()
        .collect()
}

fn diagnostic_key(d: &Diagnostic) -> String {
    let kind = serde_json::to_string(&d.kind).unwrap_or_default();
    let module = d.module_id.as_deref().unwrap_or("-");
    format!("{kind}|{module}|{}", d.message)
}
