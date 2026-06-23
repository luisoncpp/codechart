// @Architecture(descriptionShort="Resolves modules into nested groups and facades")
// grouping — assign modules to a nested group tree and designate facades
// (Phase 3). Pure: takes the file list + parsed `GroupDef`s, returns group nodes,
// per-module group assignment, the facade set, and configError diagnostics.
//
// Membership sources (`match`/`files`/`groups`) and folder ownership are resolved
// in `claim`; parentId in `nesting`; the no-config fallback in `infer`. Overlaps
// (a module claimed by two groups) and bad facade/`groups` refs become
// configErrors — the rest of the tree still builds (partial-results discipline).

mod claim;
mod infer;
mod matcher;
mod nesting;

#[cfg(test)]
mod tests;

use std::collections::{BTreeMap, BTreeSet};

use crate::contract::{Annotation, Diagnostic, GroupNode};
use crate::project_config::GroupDef;

use claim::{assign_modules, facades_for};
use infer::infer_groups;
use nesting::resolve_nesting;

/// The grouping result consumed by `analysis` (Phase 4) to stamp `ModuleNode`s.
pub struct ResolvedGroups {
    /// Group tree, sorted by id.
    pub groups: Vec<GroupNode>,
    /// Module path → owning group id (modules with no group are absent).
    pub module_group: BTreeMap<String, String>,
    /// Module paths designated as a facade of their group.
    pub facades: BTreeSet<String>,
    /// configErrors from overlaps, unknown facades, and unknown `groups` refs.
    pub diagnostics: Vec<Diagnostic>,
}

/// Resolve `files` into a group tree using `defs`. With no defs, fall back to
/// directory-based folder inference. `defs` are expected sorted by id.
pub fn resolve_groups(files: &[String], defs: &[GroupDef]) -> ResolvedGroups {
    if defs.is_empty() {
        return infer_groups(files);
    }
    build_from_defs(files, defs)
}

fn build_from_defs(files: &[String], defs: &[GroupDef]) -> ResolvedGroups {
    let assignment = assign_modules(files, defs);
    let nesting = resolve_nesting(defs);
    let mut diagnostics = assignment.diagnostics;
    diagnostics.extend(nesting.diagnostics);
    let mut facades = BTreeSet::new();
    let mut groups = Vec::new();
    for def in defs {
        let members = members_of(&def.id, &assignment.module_group);
        let (facade_ids, facade_diags) = facades_for(def, &members);
        diagnostics.extend(facade_diags);
        facades.extend(facade_ids.iter().cloned());
        groups.push(build_node(def, &nesting.parent_of, facade_ids));
    }
    groups.sort_by(|a, b| a.id.cmp(&b.id));
    ResolvedGroups {
        groups,
        module_group: assignment.module_group,
        facades,
        diagnostics,
    }
}

fn members_of(group_id: &str, module_group: &BTreeMap<String, String>) -> BTreeSet<String> {
    module_group
        .iter()
        .filter(|(_, g)| g.as_str() == group_id)
        .map(|(m, _)| m.clone())
        .collect()
}

fn build_node(
    def: &GroupDef,
    parent_of: &BTreeMap<String, String>,
    facade_module_ids: Vec<String>,
) -> GroupNode {
    GroupNode {
        id: def.id.clone(),
        label: def.label.clone(),
        parent_id: parent_of.get(&def.id).cloned(),
        color: def.color.clone(),
        facade_module_ids,
        annotation: annotation_from(def),
    }
}

fn annotation_from(def: &GroupDef) -> Option<Annotation> {
    if def.description_short.is_none() && def.description_long.is_none() && def.icon.is_none() {
        return None;
    }
    Some(Annotation {
        type_name: None,
        group: None,
        description_short: def.description_short.clone(),
        description_long: def.description_long.clone(),
        icon: def.icon.clone(),
    })
}
