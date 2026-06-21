use std::collections::HashSet;

use super::types::{Edge, GroupNode, ModuleNode};

/// Why a `ProjectGraphBuilder::build()` was rejected.
///
/// Each variant maps to one of the five §2.2 domain invariants. Note that the
/// `ProjectGraph` data model already makes two of them partly structural — a
/// module carries a single `group_id`, so it cannot literally be placed in two
/// groups, and `parent_id` is single so containment cannot be a DAG. The checks
/// below enforce the remaining teeth of each invariant on the data we *can* see.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BuildError {
    /// Inv. 1 — containment must be a tree: a `parent_id` is unknown or cyclic.
    SiblingOverlap(String),
    /// Inv. 2 — a module's `group_id` references a group that does not exist.
    MultiGroupMembership(String),
    /// Inv. 3 — a group's facade module is missing or belongs to another group.
    ForeignFacade(String),
    /// Inv. 4 — an edge endpoint references a module id that does not exist.
    DanglingEdge(String),
    /// Inv. 5 — ids must be stable & unique: an id is empty or duplicated.
    NondeterministicId(String),
}

impl std::fmt::Display for BuildError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::SiblingOverlap(d) => write!(f, "invalid group tree: {d}"),
            Self::MultiGroupMembership(d) => write!(f, "unknown module group: {d}"),
            Self::ForeignFacade(d) => write!(f, "invalid facade: {d}"),
            Self::DanglingEdge(d) => write!(f, "dangling edge: {d}"),
            Self::NondeterministicId(d) => write!(f, "non-unique id: {d}"),
        }
    }
}

impl std::error::Error for BuildError {}

pub fn validate(
    groups: &[GroupNode],
    modules: &[ModuleNode],
    edges: &[Edge],
) -> Result<(), BuildError> {
    check_unique_ids(groups, modules, edges)?;
    let group_ids: HashSet<&str> = groups.iter().map(|g| g.id.as_str()).collect();
    let module_ids: HashSet<&str> = modules.iter().map(|m| m.id.as_str()).collect();
    check_group_tree(groups, &group_ids)?;
    check_module_groups(modules, &group_ids)?;
    check_facades(groups, modules)?;
    check_edges(edges, &module_ids)?;
    Ok(())
}

fn check_unique_ids(
    groups: &[GroupNode],
    modules: &[ModuleNode],
    edges: &[Edge],
) -> Result<(), BuildError> {
    let mut seen: HashSet<&str> = HashSet::new();
    for id in groups
        .iter()
        .map(|g| g.id.as_str())
        .chain(modules.iter().map(|m| m.id.as_str()))
        .chain(edges.iter().map(|e| e.id.as_str()))
    {
        if id.is_empty() {
            return Err(BuildError::NondeterministicId("empty id".into()));
        }
        if !seen.insert(id) {
            return Err(BuildError::NondeterministicId(format!("duplicate id {id}")));
        }
    }
    Ok(())
}

fn check_group_tree(groups: &[GroupNode], group_ids: &HashSet<&str>) -> Result<(), BuildError> {
    for group in groups {
        let Some(parent) = group.parent_id.as_deref() else {
            continue;
        };
        if !group_ids.contains(parent) {
            return Err(BuildError::SiblingOverlap(format!(
                "group {} has unknown parent {parent}",
                group.id
            )));
        }
    }
    detect_group_cycle(groups)
}

fn detect_group_cycle(groups: &[GroupNode]) -> Result<(), BuildError> {
    for start in groups {
        let mut current = start.parent_id.as_deref();
        let mut hops = 0;
        while let Some(parent) = current {
            if parent == start.id {
                return Err(BuildError::SiblingOverlap(format!(
                    "group {} is part of a parent cycle",
                    start.id
                )));
            }
            hops += 1;
            if hops > groups.len() {
                return Err(BuildError::SiblingOverlap("group parent cycle".into()));
            }
            current = groups
                .iter()
                .find(|g| g.id == parent)
                .and_then(|g| g.parent_id.as_deref());
        }
    }
    Ok(())
}

fn check_module_groups(modules: &[ModuleNode], group_ids: &HashSet<&str>) -> Result<(), BuildError> {
    for module in modules {
        let Some(group_id) = module.group_id.as_deref() else {
            continue;
        };
        if !group_ids.contains(group_id) {
            return Err(BuildError::MultiGroupMembership(format!(
                "module {} references unknown group {group_id}",
                module.id
            )));
        }
    }
    Ok(())
}

fn check_facades(groups: &[GroupNode], modules: &[ModuleNode]) -> Result<(), BuildError> {
    for group in groups {
        for facade_id in &group.facade_module_ids {
            let owner = modules.iter().find(|m| &m.id == facade_id);
            match owner {
                None => {
                    return Err(BuildError::ForeignFacade(format!(
                        "group {} lists unknown facade {facade_id}",
                        group.id
                    )));
                }
                Some(module) if module.group_id.as_deref() != Some(group.id.as_str()) => {
                    return Err(BuildError::ForeignFacade(format!(
                        "facade {facade_id} does not belong to group {}",
                        group.id
                    )));
                }
                _ => {}
            }
        }
    }
    Ok(())
}

fn check_edges(edges: &[Edge], module_ids: &HashSet<&str>) -> Result<(), BuildError> {
    for edge in edges {
        let missing = [&edge.source, &edge.target]
            .into_iter()
            .find(|id| !module_ids.contains(id.as_str()));
        if let Some(id) = missing {
            return Err(BuildError::DanglingEdge(format!(
                "edge {} references unknown module {id}",
                edge.id
            )));
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::contract::types::{EdgeKind, Language, ModuleMetrics};

    fn group(id: &str, parent: Option<&str>, facades: &[&str]) -> GroupNode {
        GroupNode {
            id: id.into(),
            label: id.into(),
            parent_id: parent.map(Into::into),
            color: None,
            facade_module_ids: facades.iter().map(|s| (*s).into()).collect(),
            annotation: None,
        }
    }

    fn module(id: &str, group_id: Option<&str>) -> ModuleNode {
        ModuleNode {
            id: id.into(),
            path: id.into(),
            label: id.into(),
            language: Language::TypeScript,
            group_id: group_id.map(Into::into),
            is_facade: false,
            metrics: ModuleMetrics::default(),
            exported_symbols: vec![],
            annotation: None,
        }
    }

    fn import_edge(source: &str, target: &str) -> Edge {
        Edge {
            id: format!("{source}->{target}:import:0"),
            source: source.into(),
            target: target.into(),
            kind: EdgeKind::Import,
            trigger: "import".into(),
            is_violation: false,
        }
    }

    #[test]
    fn accepts_a_consistent_graph() {
        let groups = vec![group("core", None, &["m1"])];
        let modules = vec![module("m1", Some("core")), module("m2", Some("core"))];
        let edges = vec![import_edge("m1", "m2")];
        assert_eq!(validate(&groups, &modules, &edges), Ok(()));
    }

    #[test]
    fn rejects_sibling_overlap_via_unknown_parent() {
        let groups = vec![group("core", Some("ghost"), &[])];
        let err = validate(&groups, &[], &[]).unwrap_err();
        assert!(matches!(err, BuildError::SiblingOverlap(_)));
    }

    #[test]
    fn rejects_group_parent_cycle() {
        let groups = vec![group("a", Some("b"), &[]), group("b", Some("a"), &[])];
        let err = validate(&groups, &[], &[]).unwrap_err();
        assert!(matches!(err, BuildError::SiblingOverlap(_)));
    }

    #[test]
    fn rejects_multi_group_membership() {
        let modules = vec![module("m1", Some("ghost"))];
        let err = validate(&[], &modules, &[]).unwrap_err();
        assert!(matches!(err, BuildError::MultiGroupMembership(_)));
    }

    #[test]
    fn rejects_foreign_facade() {
        let groups = vec![group("core", None, &["m1"]), group("ui", None, &[])];
        let modules = vec![module("m1", Some("ui"))];
        let err = validate(&groups, &modules, &[]).unwrap_err();
        assert!(matches!(err, BuildError::ForeignFacade(_)));
    }

    #[test]
    fn rejects_dangling_edge() {
        let modules = vec![module("m1", None)];
        let edges = vec![import_edge("m1", "ghost")];
        let err = validate(&[], &modules, &edges).unwrap_err();
        assert!(matches!(err, BuildError::DanglingEdge(_)));
    }

    #[test]
    fn rejects_duplicate_ids() {
        let modules = vec![module("m1", None), module("m1", None)];
        let err = validate(&[], &modules, &[]).unwrap_err();
        assert!(matches!(err, BuildError::NondeterministicId(_)));
    }
}
