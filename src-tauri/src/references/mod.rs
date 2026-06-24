// @Architecture(descriptionShort="Resolves imports to edges and architecture diagnostics")
// references — turn parsed local facts into graph edges + import diagnostics
// (Phase 4). Pure: takes the parsed modules, resolves each relative import
// (TDD §7) against the set of known module ids, and produces solid `import`
// edges or `unresolvedImport` diagnostics. Package (non-relative) imports are
// external metadata — neither edge nor diagnostic.
//
// `flag_drift` (Phase 8) is a second pass over the resolved edges: it marks
// facade-bypass edges `is_violation` + emits `architectureViolation`s.
// `classify_soft` (Phase 9) pairs event emit/listen signals into `soft` edges.
// `classify_interface_seams` (Phase 10) pairs interface importers with
// cross-group implementors into `soft` seam edges (TDD §2.4).

mod drift;
mod interface_seams;
mod resolve;
mod soft;
mod tauri_ipc;

#[cfg(test)]
mod tests;

pub use drift::{flag_drift, GroupBoundaries};
pub use interface_seams::classify_interface_seams;
pub use soft::classify_soft;
pub use tauri_ipc::classify_tauri_ipc;

use std::collections::BTreeSet;

use crate::contract::{Diagnostic, DiagnosticKind, Edge, EdgeKind, Severity};
use crate::language_adapter::{ParsedImport, ParsedModule};

use resolve::{is_relative, resolve_relative};

/// Edges + diagnostics derived from import resolution, consumed by `analysis`.
pub struct ResolvedReferences {
    /// Solid `import` edges, sorted by `(source, target)` then ordinal.
    pub edges: Vec<Edge>,
    /// `unresolvedImport` diagnostics for relative imports with no target.
    pub diagnostics: Vec<Diagnostic>,
}

/// Resolve every import/re-export in `parsed` into edges and diagnostics. Known
/// module ids are the parsed paths themselves (caller owns id = path).
pub fn resolve_references(parsed: &[ParsedModule]) -> ResolvedReferences {
    let known: BTreeSet<&str> = parsed.iter().map(|m| m.path.as_str()).collect();
    let mut targets: Vec<(String, String)> = Vec::new();
    let mut diagnostics: Vec<Diagnostic> = Vec::new();
    let mut modules: Vec<&ParsedModule> = parsed.iter().collect();
    modules.sort_by(|a, b| a.path.cmp(&b.path));
    for module in modules {
        resolve_module(module, &known, &mut targets, &mut diagnostics);
    }
    ResolvedReferences {
        edges: build_edges(targets),
        diagnostics,
    }
}

/// Resolve one module's imports + re-exports, appending edge targets / diagnostics.
fn resolve_module(
    module: &ParsedModule,
    known: &BTreeSet<&str>,
    targets: &mut Vec<(String, String)>,
    diagnostics: &mut Vec<Diagnostic>,
) {
    for import in module.imports.iter().chain(module.reexports.iter()) {
        if !is_relative(&import.specifier) {
            continue;
        }
        match resolve_relative(&module.path, &import.specifier, known) {
            Some(target) => targets.push((module.path.clone(), target)),
            None => diagnostics.push(unresolved(&module.path, import)),
        }
    }
}

/// An `unresolvedImport` diagnostic keyed deterministically by importer+specifier.
fn unresolved(importer: &str, import: &ParsedImport) -> Diagnostic {
    let specifier = &import.specifier;
    Diagnostic {
        id: format!("unresolved:{importer}:{specifier}"),
        severity: Severity::Warning,
        kind: DiagnosticKind::UnresolvedImport,
        message: format!("Cannot resolve import \"{specifier}\" from {importer}"),
        module_id: Some(importer.to_string()),
        edge_id: None,
        unresolved_target: Some(specifier.clone()),
    }
}

/// Sort edge targets and assign stable ids with a per-pair ordinal.
fn build_edges(mut targets: Vec<(String, String)>) -> Vec<Edge> {
    targets.sort();
    let mut edges = Vec::with_capacity(targets.len());
    let mut prev: Option<(String, String)> = None;
    let mut ordinal = 0;
    for (source, target) in targets {
        match &prev {
            Some(p) if *p == (source.clone(), target.clone()) => ordinal += 1,
            _ => ordinal = 0,
        }
        edges.push(import_edge(&source, &target, ordinal));
        prev = Some((source, target));
    }
    edges
}

/// A solid `import` edge. Id = `${source}->${target}:import:${ordinal}`.
fn import_edge(source: &str, target: &str, ordinal: u32) -> Edge {
    Edge {
        id: format!("{source}->{target}:import:{ordinal}"),
        source: source.to_string(),
        target: target.to_string(),
        kind: EdgeKind::Import,
        trigger: "import".to_string(),
        is_violation: false,
    }
}
