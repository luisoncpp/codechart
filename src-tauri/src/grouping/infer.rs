// @Architecture(descriptionShort="Infers groups from directory layout when no group config exists")

use std::collections::{BTreeMap, BTreeSet};

use crate::contract::GroupNode;

use super::matcher::is_ancestor_dir;
use super::ResolvedGroups;

/// Infer groups purely from the directory tree of `files`.
pub fn infer_groups(files: &[String]) -> ResolvedGroups {
    let dirs: BTreeSet<String> = files
        .iter()
        .filter_map(|f| parent_dir(f))
        .flat_map(|dir| dir_prefixes(&dir))
        .collect();
    let mut module_group = BTreeMap::new();
    let mut facades = BTreeSet::new();
    for file in files {
        if let Some(dir) = parent_dir(file) {
            module_group.insert(file.clone(), group_id(&dir));
        }
    }
    let groups = dirs
        .iter()
        .map(|dir| infer_one(dir, &dirs, files, &mut facades))
        .collect();
    ResolvedGroups {
        groups,
        module_group,
        facades,
        diagnostics: Vec::new(),
    }
}

fn infer_one(
    dir: &str,
    dirs: &BTreeSet<String>,
    files: &[String],
    facades: &mut BTreeSet<String>,
) -> GroupNode {
    let facade_module_ids = infer_facades(dir, files, facades);
    GroupNode {
        id: group_id(dir),
        label: humanize(dir.rsplit('/').next().unwrap_or(dir)),
        parent_id: nearest_dir_group(dir, dirs),
        color: None,
        facade_module_ids,
        ..Default::default()
    }
}

fn infer_facades(dir: &str, files: &[String], facades: &mut BTreeSet<String>) -> Vec<String> {
    let mut ids = Vec::new();
    for candidate in ["index.ts", "index.tsx", "mod.rs", "lib.rs"] {
        let id = format!("{dir}/{candidate}");
        if files.contains(&id) {
            facades.insert(id.clone());
            ids.push(id);
        }
    }
    ids
}

fn nearest_dir_group(dir: &str, dirs: &BTreeSet<String>) -> Option<String> {
    dirs.iter()
        .filter(|other| other.as_str() != dir && is_ancestor_dir(other, dir))
        .max_by_key(|other| other.len())
        .map(|other| group_id(other))
}

fn parent_dir(path: &str) -> Option<String> {
    path.rsplit_once('/').map(|(dir, _)| dir.to_string())
}

/// Every prefix of `dir`, e.g. `crates/app/src` → `crates`, `crates/app`, `crates/app/src`.
fn dir_prefixes(dir: &str) -> Vec<String> {
    if dir.is_empty() {
        return Vec::new();
    }
    let parts: Vec<&str> = dir.split('/').collect();
    (1..=parts.len())
        .map(|n| parts[..n].join("/"))
        .collect()
}

fn group_id(dir: &str) -> String {
    format!("folder:{dir}")
}

fn humanize(segment: &str) -> String {
    let mut chars = segment.chars();
    match chars.next() {
        Some(first) => first.to_uppercase().chain(chars).collect(),
        None => segment.to_string(),
    }
}
