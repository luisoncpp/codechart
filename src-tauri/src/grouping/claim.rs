// @Architecture(descriptionShort="Assigns each module to at most one group via membership rules")

use std::collections::{BTreeMap, BTreeSet};

use crate::contract::Diagnostic;
use crate::project_config::{config_error, GroupDef};

use super::matcher::{build_exclude, build_matcher, is_ancestor_dir, join_rel};

/// Modules assigned to exactly one group, plus configErrors for overlaps.
pub struct Assignment {
    pub module_group: BTreeMap<String, String>,
    pub diagnostics: Vec<Diagnostic>,
}

/// Resolve every file to at most one group. `defs` must be sorted by id.
pub fn assign_modules(files: &[String], defs: &[GroupDef]) -> Assignment {
    let mut claims: BTreeMap<String, Vec<String>> = BTreeMap::new();
    for def in defs.iter().filter(|d| !d.uses_folder_ownership()) {
        for module in source_claims(def, files) {
            record(&mut claims, module, &def.id);
        }
    }
    for file in files {
        if let Some(def) = best_folder_owner(file, defs) {
            if !is_excluded(def, file) {
                record(&mut claims, file.clone(), &def.id);
            }
        }
    }
    resolve_claims(claims)
}

fn record(claims: &mut BTreeMap<String, Vec<String>>, module: String, group_id: &str) {
    let owners = claims.entry(module).or_default();
    if !owners.iter().any(|g| g == group_id) {
        owners.push(group_id.to_string());
    }
}

fn resolve_claims(claims: BTreeMap<String, Vec<String>>) -> Assignment {
    let mut module_group = BTreeMap::new();
    let mut diagnostics = Vec::new();
    for (module, owners) in claims {
        if owners.len() == 1 {
            module_group.insert(module, owners.into_iter().next().unwrap());
            continue;
        }
        diagnostics.push(config_error(
            &format!("overlap:{module}"),
            &format!("module {module} is claimed by multiple groups: {}", owners.join(", ")),
        ));
    }
    Assignment { module_group, diagnostics }
}

/// Membership-source claims (`match` + `files`), filtered by `exclude`.
fn source_claims(def: &GroupDef, files: &[String]) -> BTreeSet<String> {
    let mut set = BTreeSet::new();
    for entry in &def.files {
        let resolved = join_rel(&def.dir, entry);
        if files.contains(&resolved) {
            set.insert(resolved);
        }
    }
    for entry in &def.match_globs {
        let Some(matcher) = build_matcher(&def.dir, entry) else { continue };
        for file in files.iter().filter(|f| matcher.matches(f)) {
            set.insert(file.clone());
        }
    }
    set.retain(|m| !is_excluded(def, m));
    set
}

/// The folder-ownership group with the longest ancestor `dir` for `file`.
fn best_folder_owner<'a>(file: &str, defs: &'a [GroupDef]) -> Option<&'a GroupDef> {
    defs.iter()
        .filter(|d| d.uses_folder_ownership() && owns_folder(&d.dir, file))
        .max_by_key(|d| d.dir.len())
}

fn owns_folder(dir: &str, file: &str) -> bool {
    dir.is_empty() || is_ancestor_dir(dir, file)
}

fn is_excluded(def: &GroupDef, path: &str) -> bool {
    def.exclude
        .iter()
        .filter_map(|e| build_exclude(&def.dir, e))
        .any(|m| m.matches(path))
}

/// Facade module ids for a group, given the modules assigned to it. Explicit
/// `facades` that name a non-member produce a configError; absent `facades`
/// defaults to `index.ts`/`index.tsx` in the group folder when present.
pub fn facades_for(def: &GroupDef, members: &BTreeSet<String>) -> (Vec<String>, Vec<Diagnostic>) {
    let mut facades = Vec::new();
    let mut diagnostics = Vec::new();
    match &def.facades {
        Some(list) => resolve_explicit(def, list, members, &mut facades, &mut diagnostics),
        None => {
            for candidate in ["index.ts", "index.tsx", "mod.rs", "lib.rs"] {
                let id = join_rel(&def.dir, candidate);
                if members.contains(&id) {
                    facades.push(id);
                }
            }
        }
    }
    facades.sort();
    (facades, diagnostics)
}

fn resolve_explicit(
    def: &GroupDef,
    list: &[String],
    members: &BTreeSet<String>,
    facades: &mut Vec<String>,
    diagnostics: &mut Vec<Diagnostic>,
) {
    for entry in list {
        let id = join_rel(&def.dir, entry);
        if members.contains(&id) {
            facades.push(id);
            continue;
        }
        diagnostics.push(config_error(
            &format!("facade:{}:{id}", def.id),
            &format!("group {} lists facade {id} which is not one of its modules", def.id),
        ));
    }
}
