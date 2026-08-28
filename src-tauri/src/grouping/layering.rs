// @Architecture(descriptionShort="Validates group-to-group layering rules from *.group.md")

use std::collections::{BTreeMap, BTreeSet};

use crate::contract::Diagnostic;
use crate::project_config::{config_error, GroupDef};

/// Validated layering constraint for one importer group.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GroupLayering {
    pub must_not_import: BTreeSet<String>,
    /// `None` = no allowlist; `Some` (even empty) = only these groups + own subtree.
    pub may_import: Option<BTreeSet<String>>,
}

/// Keep known group ids; unknown names become `configError`s and are dropped.
pub fn resolve_layering(defs: &[GroupDef]) -> (BTreeMap<String, GroupLayering>, Vec<Diagnostic>) {
    let ids: BTreeSet<&str> = defs.iter().map(|d| d.id.as_str()).collect();
    let mut rules = BTreeMap::new();
    let mut diagnostics = Vec::new();
    for def in defs {
        let (rule, diags) = rule_for(def, &ids);
        diagnostics.extend(diags);
        if has_constraint(&rule) {
            rules.insert(def.id.clone(), rule);
        }
    }
    (rules, diagnostics)
}

fn has_constraint(rule: &GroupLayering) -> bool {
    !rule.must_not_import.is_empty() || rule.may_import.is_some()
}

fn rule_for(def: &GroupDef, ids: &BTreeSet<&str>) -> (GroupLayering, Vec<Diagnostic>) {
    let (must_not_import, mut diagnostics) = retain_known(&def.must_not_import, &def.id, ids);
    let may_import = def.may_import.as_ref().map(|list| {
        let (kept, diags) = retain_known(list, &def.id, ids);
        diagnostics.extend(diags);
        kept
    });
    (
        GroupLayering {
            must_not_import,
            may_import,
        },
        diagnostics,
    )
}

fn retain_known(
    listed: &[String],
    group_id: &str,
    ids: &BTreeSet<&str>,
) -> (BTreeSet<String>, Vec<Diagnostic>) {
    let mut kept = BTreeSet::new();
    let mut diagnostics = Vec::new();
    for id in listed {
        if ids.contains(id.as_str()) {
            kept.insert(id.clone());
            continue;
        }
        diagnostics.push(config_error(
            &format!("layer:{group_id}:{id}"),
            &format!("group {group_id} lists unknown group {id} in a layering rule"),
        ));
    }
    (kept, diagnostics)
}
