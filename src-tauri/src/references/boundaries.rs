// @Architecture(descriptionShort="Owns the group facts every edge post-pass reads, plus group-tree walks")

use std::collections::{BTreeMap, BTreeSet};

/// Group facts the edge post-passes need: each module's owning group, the group
/// tree, layering tags, the groups that keep their members private (have ≥1
/// facade), and the facade set. Built by `analysis::group_boundaries`; read by
/// `drift`, `layering`, and `interface_seams`.
pub struct GroupBoundaries {
    /// Module id → owning group id.
    pub module_group: BTreeMap<String, String>,
    /// Group id → parent group id (for subtree containment checks).
    pub parent_of: BTreeMap<String, String>,
    /// Group id → its `tags` (layering by tag; a tag covers the group's subtree).
    pub group_tags: BTreeMap<String, BTreeSet<String>>,
    /// Facade module id → tags that **replace** its group's for that target.
    pub facade_tags: BTreeMap<String, BTreeSet<String>>,
    /// Groups with ≥1 facade — their non-facade members are private.
    pub faceted_groups: BTreeSet<String>,
    /// Module ids designated as a facade of their group.
    pub facades: BTreeSet<String>,
}

/// `group` followed by every ancestor, nearest first. Empty when `group` is
/// `None` (an ungrouped module).
pub(super) fn ancestor_chain(group: Option<&str>, bounds: &GroupBoundaries) -> Vec<String> {
    let mut chain = Vec::new();
    let mut current = group;
    while let Some(id) = current {
        chain.push(id.to_string());
        current = bounds.parent_of.get(id).map(String::as_str);
    }
    chain
}

/// True when `member` is `ancestor` or any descendant of it (so a module nested
/// deeper than a group is still "inside" that group's boundary).
pub(super) fn in_subtree(member: Option<&str>, ancestor: &str, bounds: &GroupBoundaries) -> bool {
    let mut current = member;
    while let Some(group) = current {
        if group == ancestor {
            return true;
        }
        current = bounds.parent_of.get(group).map(String::as_str);
    }
    false
}
