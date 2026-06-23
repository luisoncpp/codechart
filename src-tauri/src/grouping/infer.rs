// Folder inference, private to `grouping`. When a project ships no `*.group.md`
// files, infer one group per directory that directly contains source files, with
// `index.ts`/`index.tsx` as the facade and directory nesting for parentId.

use std::collections::{BTreeMap, BTreeSet};

use crate::contract::GroupNode;

use super::matcher::is_ancestor_dir;
use super::ResolvedGroups;

/// Infer groups purely from the directory tree of `files`.
pub fn infer_groups(files: &[String]) -> ResolvedGroups {
    let dirs: BTreeSet<String> = files.iter().filter_map(|f| parent_dir(f)).collect();
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
    ResolvedGroups { groups, module_group, facades, diagnostics: Vec::new() }
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
        annotation: None,
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
