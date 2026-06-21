// drift — flag facade-bypass architecture violations (Phase 8, spec §3.1/§10).
//
// An `import` edge into a *non-facade* member of a group that designates a facade
// ("private"), from a module that lives *outside* that group's subtree, is a
// facade bypass: the edge's `is_violation` is set and an `architectureViolation`
// diagnostic explains it. Facade-less groups are public — imports into them are
// never flagged (no false positives for cross-cutting/shared groups).

use std::collections::{BTreeMap, BTreeSet};

use crate::contract::{Diagnostic, DiagnosticKind, Edge, Severity};

/// Group facts drift needs: each module's owning group, the group tree, the
/// groups that keep their members private (have ≥1 facade), and the facade set.
pub struct GroupBoundaries {
    /// Module id → owning group id.
    pub module_group: BTreeMap<String, String>,
    /// Group id → parent group id (for subtree containment checks).
    pub parent_of: BTreeMap<String, String>,
    /// Groups with ≥1 facade — their non-facade members are private.
    pub faceted_groups: BTreeSet<String>,
    /// Module ids designated as a facade of their group.
    pub facades: BTreeSet<String>,
}

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
    let group = bounds.module_group.get(&edge.target)?;
    if !bounds.faceted_groups.contains(group) {
        return None; // facade-less group is public
    }
    if bounds.facades.contains(&edge.target) {
        return None; // importing the facade itself is the sanctioned path
    }
    if within_subtree(bounds.module_group.get(&edge.source), group, bounds) {
        return None; // importer lives inside the group's own subtree
    }
    Some(group)
}

/// True when `source_group` is `target` or any descendant of it (so a module
/// nested deeper than the facade's group is still "inside" the boundary).
fn within_subtree(
    source_group: Option<&String>,
    target: &str,
    bounds: &GroupBoundaries,
) -> bool {
    let mut current = source_group.map(String::as_str);
    while let Some(group) = current {
        if group == target {
            return true;
        }
        current = bounds.parent_of.get(group).map(String::as_str);
    }
    false
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
