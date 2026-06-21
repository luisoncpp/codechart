// analysis — the deep module that composes Phases 2–4 into a `ProjectGraph`
// (Phase 4). The IPC layer and CLI see only `analyze_project`; the adapters,
// grouping, references, and diagnostics sub-modules stay behind this seam.
//
// Partial-results discipline (D5): a file the adapter rejects becomes a
// `parseError` diagnostic and is dropped from the graph — the rest still builds.

mod nodes;

#[cfg(test)]
mod tests;

use std::collections::{BTreeMap, BTreeSet};

use crate::contract::{
    BuildError, Diagnostic, Edge, GroupNode, ModuleNode, ProjectGraph, ProjectGraphBuilder,
};
use crate::diagnostics::{merge, parse_error};
use crate::grouping::{resolve_groups, ResolvedGroups};
use crate::language_adapter::{registry_for_path, ParsedModule};
use crate::project_config::{discover_group_defs, is_group_file};
use crate::project_source::ProjectSource;
use crate::references::{
    classify_interface_seams, classify_soft, flag_drift, resolve_references, GroupBoundaries,
};

use nodes::{build_modules, language_for, ParsedFile};

/// The validated graph's parts, ready for the builder.
struct GraphParts {
    groups: Vec<GroupNode>,
    modules: Vec<ModuleNode>,
    edges: Vec<Edge>,
    diagnostics: Vec<Diagnostic>,
}

/// Analyze a project: parse its source files, resolve groups + import edges, and
/// assemble the validated `ProjectGraph`. `root` is recorded verbatim onto the
/// graph (callers own the project path → id relationship).
pub fn analyze_project(
    source: &dyn ProjectSource,
    root: &str,
) -> Result<ProjectGraph, BuildError> {
    let files = source.list_files().unwrap_or_default();
    let (defs, config_diags) = discover_group_defs(source);
    let (parsed, parse_diags) = parse_sources(source, &files);

    let module_paths: Vec<String> = parsed.iter().map(|f| f.module.path.clone()).collect();
    let groups = resolve_groups(&module_paths, &defs);
    let parsed_modules: Vec<ParsedModule> = parsed.iter().map(|f| f.module.clone()).collect();
    let (edges, ref_diags) = resolve_edges(&parsed_modules, &groups);

    let parts = GraphParts {
        modules: build_modules(&parsed, &groups),
        diagnostics: merge(vec![config_diags, groups.diagnostics, ref_diags, parse_diags]),
        groups: groups.groups,
        edges,
    };
    assemble(root, parts)
}

/// Resolve import edges, flag facade-bypass drift (Phase 8), then append
/// event-driven `soft` edges (Phase 9) and interface-seam `soft` edges (Phase
/// 10). Imports stay sorted first; soft edges follow.
fn resolve_edges(
    parsed: &[ParsedModule],
    groups: &ResolvedGroups,
) -> (Vec<Edge>, Vec<Diagnostic>) {
    let mut refs = resolve_references(parsed);
    let bounds = group_boundaries(groups);
    let violations = flag_drift(&mut refs.edges, &bounds);
    let import_pairs = collect_import_pairs(&refs.edges);
    refs.edges.extend(classify_soft(parsed));
    refs.edges.extend(classify_interface_seams(parsed, &bounds, &import_pairs));
    let mut diagnostics = refs.diagnostics;
    diagnostics.extend(violations);
    (refs.edges, diagnostics)
}

/// Collect `(source, target)` pairs from all solid import edges.
fn collect_import_pairs(edges: &[Edge]) -> std::collections::BTreeSet<(String, String)> {
    use crate::contract::EdgeKind;
    edges
        .iter()
        .filter(|e| e.kind == EdgeKind::Import)
        .map(|e| (e.source.clone(), e.target.clone()))
        .collect()
}

/// Derive the boundary facts drift needs from the resolved group tree.
fn group_boundaries(groups: &ResolvedGroups) -> GroupBoundaries {
    let mut parent_of = BTreeMap::new();
    let mut faceted_groups = BTreeSet::new();
    for group in &groups.groups {
        if let Some(parent) = &group.parent_id {
            parent_of.insert(group.id.clone(), parent.clone());
        }
        if !group.facade_module_ids.is_empty() {
            faceted_groups.insert(group.id.clone());
        }
    }
    GroupBoundaries {
        module_group: groups.module_group.clone(),
        parent_of,
        faceted_groups,
        facades: groups.facades.clone(),
    }
}

/// Parse every adapter-supported, non-config file. Read/parse failures become
/// `parseError` diagnostics and the file is dropped.
fn parse_sources(
    source: &dyn ProjectSource,
    files: &[String],
) -> (Vec<ParsedFile>, Vec<Diagnostic>) {
    let mut parsed = Vec::new();
    let mut diagnostics = Vec::new();
    let mut paths: Vec<&String> = files
        .iter()
        .filter(|p| !is_group_file(p) && registry_for_path(p).is_some())
        .collect();
    paths.sort();
    for path in paths {
        match parse_file(source, path) {
            Ok(file) => parsed.push(file),
            Err(diagnostic) => diagnostics.push(diagnostic),
        }
    }
    (parsed, diagnostics)
}

/// Parse one file, or describe the failure as a `parseError` diagnostic.
fn parse_file(source: &dyn ProjectSource, path: &str) -> Result<ParsedFile, Diagnostic> {
    let adapter = registry_for_path(path).expect("filtered to supported extensions");
    let content = source
        .read_file(path)
        .map_err(|e| parse_error(path, &e.to_string()))?;
    match adapter.parse(path, &content) {
        Ok(module) => Ok(ParsedFile::new(module, language_for(path), &content)),
        Err(e) => Err(parse_error(path, &e.to_string())),
    }
}

/// Feed parts through the builder so the §2.2 invariants are enforced.
fn assemble(root: &str, parts: GraphParts) -> Result<ProjectGraph, BuildError> {
    let mut builder = ProjectGraphBuilder::new().version(1).root(root);
    for group in parts.groups {
        builder = builder.group(group);
    }
    for module in parts.modules {
        builder = builder.module(module);
    }
    for edge in parts.edges {
        builder = builder.edge(edge);
    }
    for diagnostic in parts.diagnostics {
        builder = builder.diagnostic(diagnostic);
    }
    builder.build()
}
