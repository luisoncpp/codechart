// @Architecture(descriptionShort="Flags group-to-group layering violations on solid imports")

use std::collections::{BTreeMap, BTreeSet};

use crate::contract::{Diagnostic, DiagnosticKind, Edge, EdgeKind, Severity};

use super::drift::GroupBoundaries;
use super::test_module::is_test_module;

/// Validated importer-group constraint (mirrors grouping, kept local so this
/// module stays decoupled from `grouping`).
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct LayeringRule {
    pub must_not_import: BTreeSet<String>,
    /// Tags whose carrier groups (and their descendants) may not be imported.
    pub must_not_import_tags: BTreeSet<String>,
    pub may_import: Option<BTreeSet<String>>,
}

/// Flag solid import edges that break a group layering rule. Does not clear
/// existing `is_violation` flags (facade bypass can coexist on the same edge).
pub fn flag_layering(
    edges: &mut [Edge],
    bounds: &GroupBoundaries,
    rules: &BTreeMap<String, LayeringRule>,
) -> Vec<Diagnostic> {
    let mut diagnostics = Vec::new();
    if rules.is_empty() {
        return diagnostics;
    }
    for edge in edges.iter_mut() {
        let Some(hit) = violating_rule(edge, bounds, rules) else {
            continue;
        };
        edge.is_violation = true;
        diagnostics.push(violation(edge, &hit));
    }
    diagnostics
}

struct LayerHit {
    from: String,
    to: String,
    deny: bool,
}

fn violating_rule(
    edge: &Edge,
    bounds: &GroupBoundaries,
    rules: &BTreeMap<String, LayeringRule>,
) -> Option<LayerHit> {
    if edge.kind != EdgeKind::Import || is_test_module(&edge.source) {
        return None;
    }
    let source_group = bounds.module_group.get(&edge.source).map(String::as_str);
    let target_group = bounds.module_group.get(&edge.target).map(String::as_str);
    for holder in ancestor_chain(source_group, bounds) {
        let Some(rule) = rules.get(&holder) else {
            continue;
        };
        if in_subtree(target_group, &holder, bounds) {
            continue;
        }
        let target = Target {
            module: &edge.target,
            group: target_group,
        };
        if let Some(hit) = rule_hit(rule, &target, bounds) {
            return Some(LayerHit {
                from: holder,
                to: hit.to,
                deny: hit.deny,
            });
        }
    }
    None
}

struct NamedHit {
    to: String,
    deny: bool,
}

/// The imported end of an edge. The module matters as well as its group: a
/// facade can override its group's tags.
struct Target<'a> {
    module: &'a str,
    group: Option<&'a str>,
}

fn rule_hit(rule: &LayeringRule, target: &Target, bounds: &GroupBoundaries) -> Option<NamedHit> {
    if let Some(named) = denied_name(rule, target.group, bounds) {
        return Some(NamedHit {
            to: named,
            deny: true,
        });
    }
    if let Some(tag) = denied_tag(rule, target, bounds) {
        return Some(NamedHit {
            to: format!("tag {tag}"),
            deny: true,
        });
    }
    if rule.may_import.is_none() {
        return None;
    }
    if allowed_by_list(rule, target.group, bounds) {
        return None;
    }
    Some(NamedHit {
        to: target.group.unwrap_or("ungrouped").to_string(),
        deny: false,
    })
}

fn denied_name(
    rule: &LayeringRule,
    target_group: Option<&str>,
    bounds: &GroupBoundaries,
) -> Option<String> {
    rule.must_not_import
        .iter()
        .find(|named| in_subtree(target_group, named, bounds))
        .cloned()
}

/// The forbidden tag the target carries, if any.
fn denied_tag(rule: &LayeringRule, target: &Target, bounds: &GroupBoundaries) -> Option<String> {
    if rule.must_not_import_tags.is_empty() {
        return None;
    }
    let carried = tags_carried_by(target, bounds);
    rule.must_not_import_tags
        .iter()
        .find(|tag| carried.contains(tag.as_str()))
        .cloned()
}

/// Tags that apply to the imported module. A facade with an explicit `tags:`
/// **replaces** its group's set (so a group can export one tagged and one
/// untagged entry point); otherwise a group tag applies to the group that
/// declares it *and every descendant*, so the whole ancestor chain is inspected.
fn tags_carried_by<'a>(target: &Target, bounds: &'a GroupBoundaries) -> BTreeSet<&'a str> {
    if let Some(own) = bounds.facade_tags.get(target.module) {
        return own.iter().map(String::as_str).collect();
    }
    ancestor_chain(target.group, bounds)
        .iter()
        .filter_map(|g| bounds.group_tags.get(g))
        .flatten()
        .map(String::as_str)
        .collect()
}

fn allowed_by_list(
    rule: &LayeringRule,
    target_group: Option<&str>,
    bounds: &GroupBoundaries,
) -> bool {
    let Some(allow) = &rule.may_import else {
        return true;
    };
    allow
        .iter()
        .any(|named| in_subtree(target_group, named, bounds))
}

fn ancestor_chain(group: Option<&str>, bounds: &GroupBoundaries) -> Vec<String> {
    let mut chain = Vec::new();
    let mut current = group;
    while let Some(id) = current {
        chain.push(id.to_string());
        current = bounds.parent_of.get(id).map(String::as_str);
    }
    chain
}

fn in_subtree(member: Option<&str>, ancestor: &str, bounds: &GroupBoundaries) -> bool {
    ancestor_chain(member, bounds).iter().any(|g| g == ancestor)
}

fn violation(edge: &Edge, hit: &LayerHit) -> Diagnostic {
    let verb = if hit.deny {
        "must not import"
    } else {
        "may not import"
    };
    Diagnostic {
        id: format!("architectureViolation:layer:{}", edge.id),
        severity: Severity::Warning,
        kind: DiagnosticKind::ArchitectureViolation,
        message: format!(
            "{} imports {}, violating layering: {} {verb} {}",
            edge.source, edge.target, hit.from, hit.to
        ),
        module_id: Some(edge.source.clone()),
        edge_id: Some(edge.id.clone()),
        unresolved_target: None,
    }
}
