// @Architecture(descriptionShort="Flags facade-bypass import violations as architecture diagnostics")

use crate::contract::{Diagnostic, DiagnosticKind, Edge, Severity};

use super::boundaries::{in_subtree, GroupBoundaries};
use super::test_module::is_test_module;

/// Flag every facade-bypass edge in place; return one `architectureViolation`
/// diagnostic per flagged edge.
pub fn flag_drift(edges: &mut [Edge], bounds: &GroupBoundaries) -> Vec<Diagnostic> {
    let mut diagnostics = Vec::new();
    for edge in edges.iter_mut() {
        let Some(group) = bypassed_group(edge, bounds) else {
            continue;
        };
        edge.is_violation = true;
        diagnostics.push(violation(edge, group));
    }
    diagnostics
}

/// The private group whose facade `edge` bypasses, or `None` when allowed.
fn bypassed_group<'a>(edge: &Edge, bounds: &'a GroupBoundaries) -> Option<&'a str> {
    if is_test_module(&edge.source) {
        return None; // tests often import private modules on purpose
    }
    let group = bounds.module_group.get(&edge.target)?;
    if !bounds.faceted_groups.contains(group) {
        return None; // facade-less group is public
    }
    if bounds.facades.contains(&edge.target) {
        return None; // importing the facade itself is the sanctioned path
    }
    let source_group = bounds.module_group.get(&edge.source).map(String::as_str);
    if in_subtree(source_group, group, bounds) {
        return None; // importer lives inside the group's own subtree
    }
    Some(group)
}

/// An `architectureViolation` linked to the offending edge + importer module.
fn violation(edge: &Edge, group: &str) -> Diagnostic {
    Diagnostic {
        id: format!("architectureViolation:{}", edge.id),
        severity: Severity::Warning,
        kind: DiagnosticKind::ArchitectureViolation,
        message: format!(
            "{} imports {}, bypassing the {group} facade",
            edge.source, edge.target
        ),
        module_id: Some(edge.source.clone()),
        edge_id: Some(edge.id.clone()),
        unresolved_target: None,
    }
}
