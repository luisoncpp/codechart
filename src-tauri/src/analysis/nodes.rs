// @Architecture(descriptionShort="Builds ModuleNodes from parsed files and resolved groups")

use crate::contract::{Annotation, Edge, EdgeKind, Language, ModuleMetrics, ModuleNode};
use crate::grouping::ResolvedGroups;
use crate::language_adapter::ParsedModule;
use crate::semantic_comments::parse_annotations;
use std::collections::{BTreeMap, BTreeSet};

/// A successfully parsed source file plus the facts node-building needs.
pub struct ParsedFile {
    pub module: ParsedModule,
    pub language: Language,
    pub annotation: Option<Annotation>,
}

impl ParsedFile {
    /// Parse `content`; pair the module with its language and first `@Architecture`
    /// annotation (if any). `None` when the adapter rejects the file.
    pub fn new(module: ParsedModule, language: Language, content: &str) -> Self {
        let annotation = parse_annotations(content).into_iter().next();
        ParsedFile {
            module,
            language,
            annotation,
        }
    }
}

/// Map a source path's extension to its contract `Language`.
pub fn language_for(path: &str) -> Language {
    match path.rsplit('.').next() {
        Some("tsx") => Language::Tsx,
        Some("rs") => Language::Rust,
        Some("cs") => Language::CSharp,
        Some("prefab") => Language::UnityPrefab,
        Some("css") => Language::Css,
        Some("cpp") | Some("cc") | Some("cxx") | Some("h") | Some("hpp") | Some("hxx") => {
            Language::Cpp
        }
        _ => Language::TypeScript,
    }
}

/// Build the `ModuleNode` list, sorted by id, stamping group + facade from `groups`.
pub fn build_modules(
    parsed: &[ParsedFile],
    groups: &ResolvedGroups,
    edges: &[Edge],
) -> Vec<ModuleNode> {
    let exports = paired_header_exports(parsed, edges);
    let mut modules: Vec<ModuleNode> = parsed
        .iter()
        .map(|f| build_module(f, groups, &exports))
        .collect();
    modules.sort_by(|a, b| a.id.cmp(&b.id));
    modules
}

fn build_module(
    file: &ParsedFile,
    groups: &ResolvedGroups,
    exports: &BTreeMap<String, Vec<String>>,
) -> ModuleNode {
    let path = &file.module.path;
    ModuleNode {
        id: path.clone(),
        path: path.clone(),
        label: basename(path).to_string(),
        language: file.language.clone(),
        group_id: groups.module_group.get(path).cloned(),
        is_facade: groups.facades.contains(path),
        metrics: ModuleMetrics {
            loc: file.module.loc,
            ..Default::default()
        },
        exported_symbols: exports.get(path).cloned().unwrap_or_default(),
        annotation: file.annotation.clone(),
    }
}

fn paired_header_exports(parsed: &[ParsedFile], edges: &[Edge]) -> BTreeMap<String, Vec<String>> {
    let mut exports = local_exports(parsed);
    let parsed_by_path: BTreeMap<&str, &ParsedFile> =
        parsed.iter().map(|f| (f.module.path.as_str(), f)).collect();
    for edge in edges {
        if edge.kind != EdgeKind::Import {
            continue;
        }
        let Some(source) = parsed_by_path.get(edge.source.as_str()) else {
            continue;
        };
        let Some(target) = parsed_by_path.get(edge.target.as_str()) else {
            continue;
        };
        if !is_paired_cpp_header(&source.module.path, &target.module.path) {
            continue;
        }
        extend_unique(
            exports.entry(edge.source.clone()).or_default(),
            &target.module.exported_symbols,
        );
    }
    exports
}

fn local_exports(parsed: &[ParsedFile]) -> BTreeMap<String, Vec<String>> {
    parsed
        .iter()
        .map(|f| (f.module.path.clone(), f.module.exported_symbols.clone()))
        .collect()
}

fn extend_unique(exports: &mut Vec<String>, symbols: &[String]) {
    let mut seen: BTreeSet<String> = exports.iter().cloned().collect();
    for symbol in symbols {
        if seen.insert(symbol.clone()) {
            exports.push(symbol.clone());
        }
    }
}

fn is_paired_cpp_header(source: &str, target: &str) -> bool {
    is_cpp_impl(source) && is_cpp_header(target) && file_stem(source) == file_stem(target)
}

fn is_cpp_impl(path: &str) -> bool {
    path.ends_with(".cpp") || path.ends_with(".cc") || path.ends_with(".cxx")
}

fn is_cpp_header(path: &str) -> bool {
    path.ends_with(".h") || path.ends_with(".hpp") || path.ends_with(".hxx")
}

fn file_stem(path: &str) -> &str {
    basename(path).split('.').next().unwrap_or(path)
}

fn basename(path: &str) -> &str {
    path.rsplit('/').next().unwrap_or(path)
}
