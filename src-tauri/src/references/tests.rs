use super::*;
use crate::contract::EdgeKind;
use crate::language_adapter::{CommSignal, ImportKind, SignalRole};

/// Build a `ParsedModule` at `path` importing each given specifier.
fn module(path: &str, specifiers: &[&str]) -> ParsedModule {
    let imports = specifiers
        .iter()
        .map(|s| ParsedImport {
            specifier: (*s).to_string(),
            kind: ImportKind::Named,
            names: vec![],
            is_type_only: false,
            is_reexport: false,
        })
        .collect();
    ParsedModule { path: path.to_string(), imports, ..Default::default() }
}

fn edge_targets(parsed: &[ParsedModule]) -> Vec<(String, String)> {
    resolve_references(parsed)
        .edges
        .into_iter()
        .map(|e| (e.source, e.target))
        .collect()
}

#[test]
fn resolves_extensionless_relative_import() {
    let parsed = vec![module("src/a.ts", &["./b"]), module("src/b.ts", &[])];
    assert_eq!(edge_targets(&parsed), [("src/a.ts".into(), "src/b.ts".into())]);
}

#[test]
fn resolves_explicit_extension() {
    let parsed = vec![module("src/a.ts", &["./b.ts"]), module("src/b.ts", &[])];
    assert_eq!(edge_targets(&parsed), [("src/a.ts".into(), "src/b.ts".into())]);
}

#[test]
fn resolves_tsx_extensionless() {
    let parsed = vec![module("src/a.ts", &["./b"]), module("src/b.tsx", &[])];
    assert_eq!(edge_targets(&parsed), [("src/a.ts".into(), "src/b.tsx".into())]);
}

#[test]
fn resolves_index_file_of_a_folder() {
    let parsed = vec![module("src/main.ts", &["./ui"]), module("src/ui/index.ts", &[])];
    assert_eq!(edge_targets(&parsed), [("src/main.ts".into(), "src/ui/index.ts".into())]);
}

#[test]
fn resolves_parent_relative_import() {
    let parsed = vec![
        module("src/ui/app.tsx", &["../core"]),
        module("src/core/index.ts", &[]),
    ];
    assert_eq!(
        edge_targets(&parsed),
        [("src/ui/app.tsx".into(), "src/core/index.ts".into())]
    );
}

#[test]
fn package_import_is_external_metadata() {
    let parsed = vec![module("src/a.ts", &["react"])];
    let refs = resolve_references(&parsed);
    assert!(refs.edges.is_empty(), "no edge for a package import");
    assert!(refs.diagnostics.is_empty(), "no diagnostic for a package import");
}

#[test]
fn unresolvable_relative_import_becomes_a_diagnostic() {
    let parsed = vec![module("src/a.ts", &["./missing"])];
    let refs = resolve_references(&parsed);
    assert!(refs.edges.is_empty());
    assert_eq!(refs.diagnostics.len(), 1);
    let diag = &refs.diagnostics[0];
    assert_eq!(diag.kind, DiagnosticKind::UnresolvedImport);
    assert_eq!(diag.id, "unresolved:src/a.ts:./missing");
    assert_eq!(diag.unresolved_target.as_deref(), Some("./missing"));
}

#[test]
fn edge_id_carries_kind_and_ordinal() {
    let parsed = vec![module("src/a.ts", &["./b"]), module("src/b.ts", &[])];
    let edges = resolve_references(&parsed).edges;
    assert_eq!(edges[0].id, "src/a.ts->src/b.ts:import:0");
}

#[test]
fn duplicate_edge_gets_incrementing_ordinal() {
    let parsed = vec![module("src/a.ts", &["./b", "./b"]), module("src/b.ts", &[])];
    let ids: Vec<String> = resolve_references(&parsed).edges.into_iter().map(|e| e.id).collect();
    assert_eq!(ids, ["src/a.ts->src/b.ts:import:0", "src/a.ts->src/b.ts:import:1"]);
}

// ---- drift detection (Phase 8) -------------------------------------------

use std::collections::{BTreeMap, BTreeSet};

/// A solid import edge between two module ids (ordinal 0).
fn edge(source: &str, target: &str) -> Edge {
    import_edge(source, target, 0)
}

/// Build `GroupBoundaries` from `(module, group)` pairs, a facade list, and the
/// `(child, parent)` group nesting.
fn boundaries(
    members: &[(&str, &str)],
    facades: &[&str],
    nesting: &[(&str, &str)],
) -> GroupBoundaries {
    let module_group: BTreeMap<String, String> =
        members.iter().map(|(m, g)| ((*m).into(), (*g).into())).collect();
    let facades: BTreeSet<String> = facades.iter().map(|f| (*f).into()).collect();
    let faceted_groups: BTreeSet<String> = facades
        .iter()
        .filter_map(|f| module_group.get(f).cloned())
        .collect();
    let parent_of = nesting.iter().map(|(c, p)| ((*c).into(), (*p).into())).collect();
    GroupBoundaries { module_group, parent_of, faceted_groups, facades }
}

#[test]
fn import_through_the_facade_is_not_a_violation() {
    let bounds = boundaries(
        &[("ui/a.ts", "ui"), ("core/index.ts", "core"), ("core/store.ts", "core")],
        &["core/index.ts"],
        &[],
    );
    let mut edges = vec![edge("ui/a.ts", "core/index.ts")];
    let diags = flag_drift(&mut edges, &bounds);
    assert!(!edges[0].is_violation);
    assert!(diags.is_empty());
}

#[test]
fn import_into_a_private_module_from_outside_is_a_violation() {
    let bounds = boundaries(
        &[("ui/a.ts", "ui"), ("core/index.ts", "core"), ("core/store.ts", "core")],
        &["core/index.ts"],
        &[],
    );
    let mut edges = vec![edge("ui/a.ts", "core/store.ts")];
    let diags = flag_drift(&mut edges, &bounds);
    assert!(edges[0].is_violation);
    assert_eq!(diags.len(), 1);
    assert_eq!(diags[0].kind, DiagnosticKind::ArchitectureViolation);
    assert_eq!(diags[0].module_id.as_deref(), Some("ui/a.ts"));
    assert_eq!(diags[0].edge_id.as_deref(), Some(edges[0].id.as_str()));
}

#[test]
fn intra_group_import_into_a_private_module_is_allowed() {
    let bounds = boundaries(
        &[("core/index.ts", "core"), ("core/store.ts", "core")],
        &["core/index.ts"],
        &[],
    );
    let mut edges = vec![edge("core/index.ts", "core/store.ts")];
    let diags = flag_drift(&mut edges, &bounds);
    assert!(!edges[0].is_violation);
    assert!(diags.is_empty());
}

#[test]
fn import_into_a_facade_less_public_group_is_never_flagged() {
    let bounds = boundaries(
        &[("ui/a.ts", "ui"), ("shared/types.ts", "shared")],
        &[], // shared declares no facade → public
        &[],
    );
    let mut edges = vec![edge("ui/a.ts", "shared/types.ts")];
    let diags = flag_drift(&mut edges, &bounds);
    assert!(!edges[0].is_violation);
    assert!(diags.is_empty());
}

#[test]
fn import_from_a_nested_subgroup_into_its_ancestor_private_is_allowed() {
    // sub is a child of core; a module in sub reaching core's private member is
    // still inside core's subtree, so it is not a bypass.
    let bounds = boundaries(
        &[("core/sub/x.ts", "sub"), ("core/store.ts", "core"), ("core/index.ts", "core")],
        &["core/index.ts"],
        &[("sub", "core")],
    );
    let mut edges = vec![edge("core/sub/x.ts", "core/store.ts")];
    let diags = flag_drift(&mut edges, &bounds);
    assert!(!edges[0].is_violation, "descendant import stays inside the boundary");
    assert!(diags.is_empty());
}

// ---- soft edges (Phase 9) ------------------------------------------------

/// A `ParsedModule` at `path` carrying the given `(role, token)` signals.
fn with_signals(path: &str, signals: &[(SignalRole, &str)]) -> ParsedModule {
    let signals = signals
        .iter()
        .map(|(role, token)| CommSignal { role: *role, token: (*token).to_string() })
        .collect();
    ParsedModule { path: path.to_string(), signals, ..Default::default() }
}

#[test]
fn matched_token_pairs_emitter_to_listener() {
    let parsed = vec![
        with_signals("a.ts", &[(SignalRole::Emit, "changed")]),
        with_signals("b.ts", &[(SignalRole::Listen, "changed")]),
    ];
    let edges = classify_soft(&parsed);
    assert_eq!(edges.len(), 1);
    assert_eq!(edges[0].source, "a.ts");
    assert_eq!(edges[0].target, "b.ts");
    assert_eq!(edges[0].kind, EdgeKind::Soft);
    assert_eq!(edges[0].trigger, "event:changed");
    assert_eq!(edges[0].id, "a.ts->b.ts:soft:0");
    assert!(!edges[0].is_violation);
}

#[test]
fn unmatched_token_produces_no_edge() {
    let parsed = vec![
        with_signals("a.ts", &[(SignalRole::Emit, "changed")]),
        with_signals("b.ts", &[(SignalRole::Listen, "other")]),
    ];
    assert!(classify_soft(&parsed).is_empty(), "tokens must match across modules");
}

#[test]
fn same_module_emit_and_listen_is_not_a_self_edge() {
    let parsed = vec![with_signals(
        "a.ts",
        &[(SignalRole::Emit, "tick"), (SignalRole::Listen, "tick")],
    )];
    assert!(classify_soft(&parsed).is_empty(), "no soft edge from a module to itself");
}

#[test]
fn duplicate_emit_in_one_module_yields_a_single_edge() {
    let parsed = vec![
        with_signals("a.ts", &[(SignalRole::Emit, "changed"), (SignalRole::Emit, "changed")]),
        with_signals("b.ts", &[(SignalRole::Listen, "changed")]),
    ];
    assert_eq!(classify_soft(&parsed).len(), 1, "emitter set is deduped per token");
}

#[test]
fn two_tokens_between_the_same_pair_get_incrementing_ordinals() {
    let parsed = vec![
        with_signals("a.ts", &[(SignalRole::Emit, "x"), (SignalRole::Emit, "y")]),
        with_signals("b.ts", &[(SignalRole::Listen, "x"), (SignalRole::Listen, "y")]),
    ];
    let ids: Vec<String> = classify_soft(&parsed).into_iter().map(|e| e.id).collect();
    assert_eq!(ids, ["a.ts->b.ts:soft:0", "a.ts->b.ts:soft:1"]);
}
