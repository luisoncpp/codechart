// @Architecture(descriptionShort="Composes parsing, grouping, and references into ProjectGraph")
// analysis — the deep module that composes Phases 2–4 into a `ProjectGraph`
// (Phase 4). The IPC layer and CLI see only `analyze_project`; the adapters,
// grouping, references, and diagnostics sub-modules stay behind this seam.
//
// Partial-results discipline (D5): a file the adapter rejects becomes a
// `parseError` diagnostic and is dropped from the graph — the rest still builds.

mod nodes;
mod options;

#[cfg(test)]
mod tests;

pub use options::AnalyzeOptions;

use std::collections::{BTreeMap, BTreeSet};

use crate::contract::{
    BuildError, Diagnostic, Edge, GroupNode, ModuleNode, ProjectGraph, ProjectGraphBuilder,
};
use crate::diagnostics::{merge, parse_error};
use crate::grouping::{resolve_groups, ResolvedGroups};
use crate::language_adapter::{registry_for_path, ParsedModule};
use crate::project_config::{
    discover_group_defs_from, ignore_patterns_with_unreal, is_group_file, retain_unignored,
    retain_without_plugins_dirs, retain_without_top_level_dot_dirs,
};
use crate::project_source::ProjectSource;
use crate::references::{
    classify_interface_seams, classify_soft, classify_tauri_ipc, classify_unity_assets, flag_cycles,
    flag_drift, resolve_imports, GroupBoundaries,
};
use crate::tsconfig_paths::load_from_source;
use crate::unity_assets::index_meta_files;
use crate::{unreal_options_from_source, UnrealOptions};

use nodes::{build_modules, language_for, ParsedFile};

/// The validated graph's parts, ready for the builder.
struct GraphParts {
    groups: Vec<GroupNode>,
    modules: Vec<ModuleNode>,
    edges: Vec<Edge>,
    diagnostics: Vec<Diagnostic>,
    is_unreal_project: bool,
}

/// Whether analysis ever opens this file, as opposed to merely seeing its path.
///
/// Exists for callers that pay per byte to *materialize* a source tree — the git
/// snapshot reads blobs out of the object database, where a repo's images, fonts and
/// lock files are usually most of the bytes and none of the graph. Everything else
/// (ignore patterns, the unreal/unity project sniffing) works off the file list, so a
/// skipped file still has to be listed; see `MemoryProjectSource::with_listing`.
///
/// Deliberately lives here rather than in the caller: the four things below are read by
/// four different submodules of this one, and a copy elsewhere would silently rot the
/// day a fifth is added.
pub fn opens_file(path: &str) -> bool {
    registry_for_path(path).is_some()
        || is_group_file(path)
        || path.ends_with(".meta")
        || crate::tsconfig_paths::is_config_path(path)
        || path == crate::unreal_config::CONFIG_PATH
}

/// Analyze a project: parse its source files, resolve groups + import edges, and
/// assemble the validated `ProjectGraph`. `root` is recorded verbatim onto the
/// graph (callers own the project path → id relationship).
pub fn analyze_project(source: &dyn ProjectSource, root: &str) -> Result<ProjectGraph, BuildError> {
    analyze_project_with_options(source, root, AnalyzeOptions::default())
}

/// Analyze a project using the requested lookback window for git-derived metrics.
pub fn analyze_project_with_metrics_window(
    source: &dyn ProjectSource,
    root: &str,
    metrics_window_days: u32,
) -> Result<ProjectGraph, BuildError> {
    analyze_project_with_options(
        source,
        root,
        AnalyzeOptions {
            metrics_window_days,
            hide_top_level_dot_dirs: true,
        },
    )
}

/// Analyze a project with the full set of analysis options.
pub fn analyze_project_with_options(
    source: &dyn ProjectSource,
    root: &str,
    options: AnalyzeOptions,
) -> Result<ProjectGraph, BuildError> {
    let unreal = unreal_options_from_source(source);
    let (files, is_unreal_project) = listed_files(source, &options, &unreal);
    let (defs, config_diags) = discover_group_defs_from(source, files.clone());
    let patterns = ignore_patterns_with_unreal(&defs, &unreal);
    let files = retain_unignored(files, &patterns);
    let meta_index = index_meta_files(source, &files);
    let (parsed, parse_diags) = parse_sources(source, &files);

    let module_paths: Vec<String> = parsed.iter().map(|f| f.module.path.clone()).collect();
    let groups = resolve_groups(&module_paths, &defs);
    let parsed_modules: Vec<ParsedModule> = parsed.iter().map(|f| f.module.clone()).collect();
    let ts_paths = load_from_source(source);
    let (edges, ref_diags) = resolve_edges(&parsed_modules, &groups, &meta_index, &unreal, &ts_paths);

    let mut modules = build_modules(&parsed, &groups, &edges);
    if crate::git::is_git_repo(root) {
        crate::git::enrich_module_metrics(root, &mut modules, options.metrics_window_days);
    }
    let parts = GraphParts {
        modules,
        diagnostics: merge(vec![
            config_diags,
            groups.diagnostics,
            ref_diags,
            parse_diags,
        ]),
        groups: groups.groups,
        edges,
        is_unreal_project,
    };
    assemble(root, parts)
}

/// List, then apply session and Unreal plugin filters. Unreal detection runs on
/// the pre-plugin list so hiding Plugins does not hide the View-menu checkbox.
fn listed_files(
    source: &dyn ProjectSource,
    options: &AnalyzeOptions,
    unreal: &UnrealOptions,
) -> (Vec<String>, bool) {
    let mut files = source.list_files().unwrap_or_default();
    if options.hide_top_level_dot_dirs {
        files = retain_without_top_level_dot_dirs(files);
    }
    let is_unreal = crate::unreal_config::is_unreal_project(&files);
    if unreal.hide_plugins {
        files = retain_without_plugins_dirs(files);
    }
    (files, is_unreal)
}

/// Resolve import edges, flag facade-bypass drift (Phase 8), then append
/// event-driven `soft` edges (Phase 9), interface-seam `soft` edges (Phase
/// 10), and Tauri IPC `soft` edges. Imports stay sorted first; soft edges follow.
fn resolve_edges(
    parsed: &[ParsedModule],
    groups: &ResolvedGroups,
    meta_index: &std::collections::BTreeMap<String, String>,
    unreal: &UnrealOptions,
    ts_paths: &crate::tsconfig_paths::PathAliases,
) -> (Vec<Edge>, Vec<Diagnostic>) {
    let aliases = if ts_paths.mappings.is_empty() {
        None
    } else {
        Some(ts_paths)
    };
    let mut refs = resolve_imports(parsed, unreal, aliases);
    let bounds = group_boundaries(groups);
    let violations = flag_drift(&mut refs.edges, &bounds);
    let module_ids: Vec<String> = parsed.iter().map(|m| m.path.clone()).collect();
    let cycle_diags = flag_cycles(&mut refs.edges, &module_ids);
    let import_pairs = collect_import_pairs(&refs.edges);
    refs.edges.extend(classify_soft(parsed));
    refs.edges
        .extend(classify_interface_seams(parsed, &bounds, &import_pairs));
    let (ipc_edges, ipc_diags) = classify_tauri_ipc(parsed);
    refs.edges.extend(ipc_edges);
    let (unity_edges, unity_diags) = classify_unity_assets(parsed, meta_index);
    refs.edges.extend(unity_edges);
    let mut diagnostics = refs.diagnostics;
    diagnostics.extend(violations);
    diagnostics.extend(cycle_diags);
    diagnostics.extend(ipc_diags);
    diagnostics.extend(unity_diags);
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
    let mut builder = ProjectGraphBuilder::new()
        .version(1)
        .root(root)
        .is_unreal_project(parts.is_unreal_project);
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
