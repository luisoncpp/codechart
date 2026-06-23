// Building `ModuleNode`s from parsed files + the resolved group tree (Phase 4).
// Private to `analysis`.

use crate::contract::{Annotation, Language, ModuleMetrics, ModuleNode};
use crate::grouping::ResolvedGroups;
use crate::language_adapter::ParsedModule;
use crate::semantic_comments::parse_annotations;

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
        ParsedFile { module, language, annotation }
    }
}

/// Map a source path's extension to its contract `Language`.
pub fn language_for(path: &str) -> Language {
    match path.rsplit('.').next() {
        Some("tsx") => Language::Tsx,
        Some("rs") => Language::Rust,
        _ => Language::TypeScript,
    }
}

/// Build the `ModuleNode` list, sorted by id, stamping group + facade from `groups`.
pub fn build_modules(parsed: &[ParsedFile], groups: &ResolvedGroups) -> Vec<ModuleNode> {
    let mut modules: Vec<ModuleNode> = parsed.iter().map(|f| build_module(f, groups)).collect();
    modules.sort_by(|a, b| a.id.cmp(&b.id));
    modules
}

fn build_module(file: &ParsedFile, groups: &ResolvedGroups) -> ModuleNode {
    let path = &file.module.path;
    ModuleNode {
        id: path.clone(),
        path: path.clone(),
        label: basename(path).to_string(),
        language: file.language.clone(),
        group_id: groups.module_group.get(path).cloned(),
        is_facade: groups.facades.contains(path),
        metrics: ModuleMetrics { loc: file.module.loc, ..Default::default() },
        exported_symbols: file.module.exported_symbols.clone(),
        annotation: file.annotation.clone(),
    }
}

fn basename(path: &str) -> &str {
    path.rsplit('/').next().unwrap_or(path)
}
