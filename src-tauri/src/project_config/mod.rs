// @Architecture(descriptionShort="Discovers and parses co-located *.group.md files")
// project_config — discover, parse, and validate co-located `*.group.md` files
// (Phase 3). A group is declared by a single `*.group.md` placed in the folder it
// describes: YAML frontmatter (metadata + membership) + markdown body (docs).
//
// Public surface: `GroupDef` (parsed config), `parse_group_def` (one file), and
// `discover_group_defs` (walk a `ProjectSource`, parse all, collect configErrors).
// The frontmatter/body parser stays private behind this boundary.

mod ignore;
mod parse;

#[cfg(test)]
mod tests;

pub use ignore::{ignore_patterns, is_ignored, retain_unignored};
pub use parse::parse_group_def;

use std::collections::BTreeSet;

use crate::contract::{Diagnostic, DiagnosticKind, Severity};
use crate::project_source::ProjectSource;

/// A parsed `*.group.md`: identity, membership rules, and documentation. Paths in
/// `facades`/`match_globs`/`files`/`exclude` are recorded verbatim; `grouping`
/// resolves them relative to `dir`.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct GroupDef {
    pub id: String,
    pub label: String,
    /// Repo-relative POSIX folder of the `*.group.md` file (`""` = root).
    pub dir: String,
    pub color: Option<String>,
    pub icon: Option<String>,
    /// `None` = default to `index.ts`/`index.tsx` in `dir`; `Some` = explicit list.
    pub facades: Option<Vec<String>>,
    /// `match` membership source — globs (or `/regex/`) over the repo-relative path.
    pub match_globs: Vec<String>,
    /// `files` membership source — explicit module paths.
    pub files: Vec<String>,
    /// `groups` membership source — child group ids that roll up under this group.
    pub group_refs: Vec<String>,
    /// `exclude` filter — globs carved out of this group's claimed set.
    pub exclude: Vec<String>,
    /// Root-only extra ignore globs, merged with built-in defaults by `analysis`.
    pub ignore: Vec<String>,
    pub description_short: Option<String>,
    pub description_long: Option<String>,
    /// When true, the group's connections are hidden by default in the canvas.
    pub disconnected: bool,
    /// Module paths (relative to `dir`) whose connections are hidden by default.
    pub disconnected_modules: Vec<String>,
}

impl GroupDef {
    /// True when no membership *source* is present — the group defaults to folder
    /// ownership. `exclude` is a filter, not a source, so it does not count here.
    pub fn uses_folder_ownership(&self) -> bool {
        self.match_globs.is_empty() && self.files.is_empty() && self.group_refs.is_empty()
    }
}

/// Why a `*.group.md` file failed to parse. Each becomes a `configError`
/// diagnostic; the rest of the graph still builds (partial-results discipline).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ConfigError {
    MissingFrontmatter,
    Yaml(String),
}

impl ConfigError {
    fn message(&self, path: &str) -> String {
        match self {
            ConfigError::MissingFrontmatter => {
                format!("{path}: missing YAML frontmatter (expected a leading `---` block)")
            }
            ConfigError::Yaml(e) => format!("{path}: invalid frontmatter: {e}"),
        }
    }
}

/// True for a repo-relative path ending in `.group.md`.
pub fn is_group_file(path: &str) -> bool {
    path.ends_with(".group.md")
}

/// Walk `source`, parse every `*.group.md`, and collect parse failures as
/// `configError` diagnostics. Duplicate ids and ignored paths are dropped with
/// a diagnostic. Defs are returned sorted by id for determinism.
pub fn discover_group_defs(
    source: &dyn ProjectSource,
) -> (Vec<GroupDef>, Vec<Diagnostic>) {
    let mut candidates = Vec::new();
    let mut diagnostics = Vec::new();
    let mut paths = source.list_files().unwrap_or_default();
    paths.sort();
    for path in paths.iter().filter(|p| is_group_file(p)) {
        match source.read_file(path) {
            Ok(content) => collect_candidate(path, &content, &mut candidates, &mut diagnostics),
            Err(e) => diagnostics.push(config_error(path, &e.to_string())),
        }
    }
    let patterns = ignore_patterns(&candidates.iter().map(|(_, d)| d).cloned().collect::<Vec<_>>());
    let mut defs = Vec::new();
    let mut seen_ids = BTreeSet::new();
    for (path, def) in candidates {
        if is_ignored(&path, &patterns) {
            continue;
        }
        if !seen_ids.insert(def.id.clone()) {
            diagnostics.push(config_error(
                &path,
                &format!("duplicate group id `{}` (already declared elsewhere)", def.id),
            ));
            continue;
        }
        defs.push(def);
    }
    defs.sort_by(|a, b| a.id.cmp(&b.id));
    (defs, diagnostics)
}

fn collect_candidate(
    path: &str,
    content: &str,
    candidates: &mut Vec<(String, GroupDef)>,
    diagnostics: &mut Vec<Diagnostic>,
) {
    match parse_group_def(path, content) {
        Ok(def) => candidates.push((path.to_string(), def)),
        Err(e) => diagnostics.push(config_error(path, &e.message(path))),
    }
}

/// Build a `configError` diagnostic keyed deterministically by path.
pub fn config_error(path: &str, message: &str) -> Diagnostic {
    Diagnostic {
        id: format!("configError:{path}"),
        severity: Severity::Error,
        kind: DiagnosticKind::ConfigError,
        message: message.to_string(),
        module_id: None,
        edge_id: None,
        unresolved_target: None,
    }
}
