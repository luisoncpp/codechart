// @Architecture(descriptionShort="Validates group-to-group layering rules from *.group.md")

use std::collections::{BTreeMap, BTreeSet};

use crate::contract::Diagnostic;
use crate::project_config::{config_error, GroupDef};

/// Validated layering constraint for one importer group.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GroupLayering {
    pub must_not_import: BTreeSet<String>,
    /// Tags whose carrier groups (and their descendants) may not be imported.
    pub must_not_import_tags: BTreeSet<String>,
    /// `None` = no allowlist; `Some` (even empty) = only these groups + own subtree.
    pub may_import: Option<BTreeSet<String>>,
}

/// Known names for validation: every declared group id and every declared tag.
struct Declared<'a> {
    ids: BTreeSet<&'a str>,
    tags: BTreeSet<&'a str>,
}

/// Every tag any group declares — on the group itself or on one of its facades.
fn declared_tags(defs: &[GroupDef]) -> BTreeSet<&str> {
    let mut tags: BTreeSet<&str> = defs
        .iter()
        .flat_map(|d| d.tags.iter().map(String::as_str))
        .collect();
    let facades = defs.iter().filter_map(|d| d.facades.as_ref()).flatten();
    tags.extend(
        facades
            .filter_map(|f| f.tags.as_ref())
            .flatten()
            .map(String::as_str),
    );
    tags
}

/// Keep known group ids and tags; unknown names become `configError`s and are dropped.
pub fn resolve_layering(defs: &[GroupDef]) -> (BTreeMap<String, GroupLayering>, Vec<Diagnostic>) {
    let declared = Declared {
        ids: defs.iter().map(|d| d.id.as_str()).collect(),
        tags: declared_tags(defs),
    };
    let mut rules = BTreeMap::new();
    let mut diagnostics = Vec::new();
    for def in defs {
        let (rule, diags) = rule_for(def, &declared);
        diagnostics.extend(diags);
        if has_constraint(&rule) {
            rules.insert(def.id.clone(), rule);
        }
    }
    (rules, diagnostics)
}

fn has_constraint(rule: &GroupLayering) -> bool {
    !rule.must_not_import.is_empty()
        || !rule.must_not_import_tags.is_empty()
        || rule.may_import.is_some()
}

fn rule_for(def: &GroupDef, declared: &Declared) -> (GroupLayering, Vec<Diagnostic>) {
    let groups = Lookup {
        group_id: &def.id,
        kind: NameKind::Group,
        known: &declared.ids,
    };
    let tags = Lookup {
        group_id: &def.id,
        kind: NameKind::Tag,
        known: &declared.tags,
    };
    let (must_not_import, mut diagnostics) = retain_known(&def.must_not_import, &groups);
    let (must_not_import_tags, tag_diags) = retain_known(&def.must_not_import_tags, &tags);
    diagnostics.extend(tag_diags);
    let may_import = def.may_import.as_ref().map(|list| {
        let (kept, diags) = retain_known(list, &groups);
        diagnostics.extend(diags);
        kept
    });
    (
        GroupLayering {
            must_not_import,
            must_not_import_tags,
            may_import,
        },
        diagnostics,
    )
}

/// Which name space a listed layering name is validated against.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum NameKind {
    Group,
    Tag,
}

impl NameKind {
    /// The noun this name space is called by in a `configError` message.
    fn noun(self) -> &'static str {
        match self {
            NameKind::Group => "group",
            NameKind::Tag => "tag",
        }
    }
}

/// One side of the validation: whose rule is being checked, against which name
/// space (group ids or tags).
struct Lookup<'a> {
    group_id: &'a str,
    kind: NameKind,
    known: &'a BTreeSet<&'a str>,
}

/// Drop names nothing in the project declares, one `configError` each.
fn retain_known(listed: &[String], at: &Lookup) -> (BTreeSet<String>, Vec<Diagnostic>) {
    let mut kept = BTreeSet::new();
    let mut diagnostics = Vec::new();
    for name in listed {
        if at.known.contains(name.as_str()) {
            kept.insert(name.clone());
            continue;
        }
        diagnostics.push(config_error(
            &format!("layer:{}:{name}", at.group_id),
            &format!(
                "group {} lists unknown {} {name} in a layering rule",
                at.group_id,
                at.kind.noun()
            ),
        ));
    }
    (kept, diagnostics)
}
