// @Architecture(descriptionShort="Resolves parent-child relationships in the group tree")

use std::collections::{BTreeMap, BTreeSet};

use crate::contract::Diagnostic;
use crate::project_config::{config_error, GroupDef};

use super::matcher::is_ancestor_dir;

/// Map of child group id → parent group id, plus configErrors for unknown refs.
pub struct Nesting {
    pub parent_of: BTreeMap<String, String>,
    pub diagnostics: Vec<Diagnostic>,
}

/// Resolve nesting for `defs` (sorted by id).
pub fn resolve_nesting(defs: &[GroupDef]) -> Nesting {
    let ids: BTreeSet<&str> = defs.iter().map(|d| d.id.as_str()).collect();
    let mut parent_of = BTreeMap::new();
    let mut diagnostics = Vec::new();
    apply_explicit_refs(defs, &ids, &mut parent_of, &mut diagnostics);
    apply_folder_nesting(defs, &mut parent_of);
    Nesting { parent_of, diagnostics }
}

fn apply_explicit_refs(
    defs: &[GroupDef],
    ids: &BTreeSet<&str>,
    parent_of: &mut BTreeMap<String, String>,
    diagnostics: &mut Vec<Diagnostic>,
) {
    for def in defs {
        for child in &def.group_refs {
            if ids.contains(child.as_str()) {
                parent_of.insert(child.clone(), def.id.clone());
                continue;
            }
            diagnostics.push(config_error(
                &format!("groupref:{}:{child}", def.id),
                &format!("group {} references unknown group {child}", def.id),
            ));
        }
    }
}

fn apply_folder_nesting(defs: &[GroupDef], parent_of: &mut BTreeMap<String, String>) {
    for def in defs {
        if parent_of.contains_key(&def.id) {
            continue;
        }
        if let Some(parent) = nearest_ancestor(def, defs) {
            parent_of.insert(def.id.clone(), parent);
        }
    }
}

fn nearest_ancestor(def: &GroupDef, defs: &[GroupDef]) -> Option<String> {
    defs.iter()
        .filter(|other| other.id != def.id && is_ancestor_dir(&other.dir, &def.dir))
        .max_by_key(|other| other.dir.len())
        .map(|other| other.id.clone())
}
