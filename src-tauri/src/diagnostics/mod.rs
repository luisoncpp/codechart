// diagnostics — normalize analysis findings into `Diagnostic`s (Phase 4).
//
// Config and import findings are already produced as `Diagnostic`s by
// `project_config`/`grouping`/`references`. This module owns the remaining
// `parseError` constructor and the deterministic merge/sort `analysis` uses to
// assemble the final list. Ids are the stable sort key.

use crate::contract::{Diagnostic, DiagnosticKind, Severity};

/// A `parseError` for a file the adapter could not parse (partial-results: the
/// rest of the graph still builds). Keyed by module path.
pub fn parse_error(path: &str, message: &str) -> Diagnostic {
    Diagnostic {
        id: format!("parseError:{path}"),
        severity: Severity::Error,
        kind: DiagnosticKind::ParseError,
        message: message.to_string(),
        module_id: Some(path.to_string()),
        edge_id: None,
        unresolved_target: None,
    }
}

/// Merge diagnostic groups into one list, deduplicated and sorted by id for
/// deterministic output.
pub fn merge(groups: Vec<Vec<Diagnostic>>) -> Vec<Diagnostic> {
    let mut all: Vec<Diagnostic> = groups.into_iter().flatten().collect();
    all.sort_by(|a, b| a.id.cmp(&b.id));
    all.dedup_by(|a, b| a.id == b.id);
    all
}
