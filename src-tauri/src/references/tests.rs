use super::*;
use crate::contract::EdgeKind;
use crate::language_adapter::{CommSignal, ImportKind, ParsedImport, SignalRole};

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

fn csharp_module(path: &str, namespace: &str, usings: &[&str]) -> ParsedModule {
    let imports = usings
        .iter()
        .map(|s| ParsedImport {
            specifier: (*s).to_string(),
            kind: ImportKind::SideEffect,
            names: vec![],
            is_type_only: false,
            is_reexport: false,
        })
        .collect();
    ParsedModule {
        path: path.to_string(),
        declared_namespace: Some(namespace.to_string()),
        imports,
        ..Default::default()
    }
}

fn csharp_api(path: &str, namespace: &str, exports: &[&str]) -> ParsedModule {
    ParsedModule {
        path: path.to_string(),
        declared_namespace: Some(namespace.to_string()),
        exported_symbols: exports.iter().map(|s| (*s).to_string()).collect(),
        ..Default::default()
    }
}

fn csharp_consumer(
    path: &str,
    namespace: &str,
    usings: &[&str],
    referenced: &[&str],
) -> ParsedModule {
    let mut module = csharp_module(path, namespace, usings);
    module.referenced_symbols = referenced.iter().map(|s| (*s).to_string()).collect();
    module
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
fn resolves_css_side_effect_import() {
    let parsed = vec![
        module("src/GraphCanvas.tsx", &["./graph-canvas.css"]),
        ParsedModule {
            path: "src/graph-canvas.css".to_string(),
            ..Default::default()
        },
    ];
    assert_eq!(
        edge_targets(&parsed),
        [("src/GraphCanvas.tsx".into(), "src/graph-canvas.css".into())]
    );
}

#[test]
fn resolves_cpp_quoted_include() {
    let parsed = vec![
        module("src/main.cpp", &["./engine/engine.h"]),
        ParsedModule {
            path: "src/engine/engine.h".to_string(),
            ..Default::default()
        },
    ];
    assert_eq!(
        edge_targets(&parsed),
        [("src/main.cpp".into(), "src/engine/engine.h".into())]
    );
}

#[test]
fn resolves_unreal_include_from_known_path() {
    let parsed = vec![
        module("Source/Game/Private/Player.cpp", &["./Characters/Player.h"]),
        ParsedModule {
            path: "Source/Game/Public/Characters/Player.h".to_string(),
            ..Default::default()
        },
    ];
    let options = crate::unreal_config::UnrealOptions {
        known_paths: vec!["Source/Game/Public".into()],
        ..Default::default()
    };
    let edges = resolve_references_with_options(&parsed, &options).edges;
    assert_eq!(edges[0].source, "Source/Game/Private/Player.cpp");
    assert_eq!(edges[0].target, "Source/Game/Public/Characters/Player.h");
}

#[test]
fn skips_unreal_engine_headers() {
    let parsed = vec![module("Source/Game/Private/Player.cpp", &[
        "./CoreMinimal.h",
        "./GameFramework/Actor.h",
    ])];
    let options = crate::unreal_config::UnrealOptions {
        exclude_engine_references: true,
        ..Default::default()
    };
    let refs = resolve_references_with_options(&parsed, &options);
    assert!(refs.edges.is_empty());
    assert!(refs.diagnostics.is_empty());
}

#[test]
fn unresolved_project_cpp_include_still_warns() {
    let parsed = vec![module("Source/Game/Private/Player.cpp", &["./MissingLocal.h"])];
    let refs = resolve_references_with_options(&parsed, &Default::default());
    assert!(refs.edges.is_empty());
    assert_eq!(refs.diagnostics.len(), 1);
    assert_eq!(refs.diagnostics[0].kind, DiagnosticKind::UnresolvedImport);
}

#[test]
fn resolves_js_extension_to_ts_source() {
    let parsed = vec![
        module("electron/ipc/handlers/project-handlers/order-handlers.ts", &[
            "../../../../src/shared/ipc.js",
            "../../../ipc-errors.js",
            "../../../ipc-runtime.js",
            "./shared.js",
        ]),
        module("src/shared/ipc.ts", &[]),
        module("electron/ipc-errors.ts", &[]),
        module("electron/ipc-runtime.ts", &[]),
        module("electron/ipc/handlers/project-handlers/shared.ts", &[]),
    ];
    assert_eq!(
        edge_targets(&parsed),
        [
            (
                "electron/ipc/handlers/project-handlers/order-handlers.ts".into(),
                "electron/ipc-errors.ts".into(),
            ),
            (
                "electron/ipc/handlers/project-handlers/order-handlers.ts".into(),
                "electron/ipc-runtime.ts".into(),
            ),
            (
                "electron/ipc/handlers/project-handlers/order-handlers.ts".into(),
                "electron/ipc/handlers/project-handlers/shared.ts".into(),
            ),
            (
                "electron/ipc/handlers/project-handlers/order-handlers.ts".into(),
                "src/shared/ipc.ts".into(),
            ),
        ]
    );
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
fn resolves_rust_mod_file() {
    let parsed = vec![
        module("src/lib.rs", &["./analysis"]),
        module("src/analysis/mod.rs", &[]),
    ];
    assert_eq!(
        edge_targets(&parsed),
        [("src/lib.rs".into(), "src/analysis/mod.rs".into())]
    );
}

#[test]
fn rust_item_import_falls_back_to_parent_module() {
    let parsed = vec![
        module(
            "src-tauri/src/tauri_api/mod.rs",
            &["../analysis/analyze_project"],
        ),
        module("src-tauri/src/analysis/mod.rs", &[]),
    ];
    let refs = resolve_references(&parsed);
    assert_eq!(
        edge_targets(&parsed),
        [(
            "src-tauri/src/tauri_api/mod.rs".into(),
            "src-tauri/src/analysis/mod.rs".into(),
        )]
    );
    assert!(
        refs.diagnostics.is_empty(),
        "item imports must not produce unresolvedImport"
    );
}

#[test]
fn rust_nested_module_item_import_resolves_to_mod_rs() {
    let parsed = vec![
        module(
            "src-tauri/src/language_adapter/csharp/tests.rs",
            &["../language_adapter/registry_for_path"],
        ),
        module("src-tauri/src/language_adapter/mod.rs", &[]),
    ];
    let refs = resolve_references(&parsed);
    assert_eq!(
        edge_targets(&parsed),
        [(
            "src-tauri/src/language_adapter/csharp/tests.rs".into(),
            "src-tauri/src/language_adapter/mod.rs".into(),
        )]
    );
    assert!(refs.diagnostics.is_empty());
}

#[test]
fn rust_external_and_local_imports_skip_false_unresolved() {
    use crate::language_adapter::registry_for_path;

    fn parse(path: &str, source: &str) -> ParsedModule {
        registry_for_path(path)
            .unwrap()
            .parse(path, source)
            .expect("parse succeeds")
    }

    let parsed = vec![
        parse(
            "src-tauri/src/language_adapter/mod.rs",
            "mod adapter_types;\nmod registry;\npub use adapter_types::CommSignal;\npub use registry::registry_for;\n",
        ),
        parse(
            "src-tauri/src/language_adapter/adapter_types.rs",
            "pub struct CommSignal;\n",
        ),
        parse(
            "src-tauri/src/language_adapter/registry.rs",
            "pub fn registry_for() {}\n",
        ),
        parse(
            "src-tauri/src/language_adapter/rust/mod.rs",
            "use tree_sitter::Parser;\nuse std::collections::BTreeSet;\n",
        ),
    ];
    let refs = resolve_references(&parsed);
    assert!(
        refs.diagnostics.is_empty(),
        "unexpected diagnostics: {:?}",
        refs.diagnostics
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
fn json_asset_import_is_external_metadata() {
    let parsed = vec![module(
        "src/ipc/analysis-client/Private/mock-analysis-client.ts",
        &["../../../../tests/fixtures/golden/project-graph.json"],
    )];
    let refs = resolve_references(&parsed);
    assert!(refs.edges.is_empty(), "no edge for a JSON asset import");
    assert!(refs.diagnostics.is_empty(), "no diagnostic for a JSON asset import");
}

#[test]
fn resolves_csharp_namespace_using() {
    let parsed = vec![
        csharp_consumer("src/ui/App.cs", "MyApp.UI", &["MyApp.Services"], &["Store"]),
        csharp_api("src/services/Store.cs", "MyApp.Services", &["Store"]),
    ];
    assert_eq!(
        edge_targets(&parsed),
        [("src/ui/App.cs".into(), "src/services/Store.cs".into())]
    );
}

#[test]
fn csharp_symbol_resolution_skips_unused_namespace_members() {
    let parsed = vec![
        csharp_consumer(
            "Save/CharacterRecord.cs",
            "MyApp.Save",
            &["MyApp.Arena2"],
            &["Arch3dFile"],
        ),
        csharp_api("API/Arch3dFile.cs", "MyApp.Arena2", &["Arch3dFile"]),
        csharp_api("API/BioFile.cs", "MyApp.Arena2", &["BioFile"]),
        csharp_api("API/BaseImageFile.cs", "MyApp.Arena2", &["BaseImageFile"]),
    ];
    assert_eq!(
        edge_targets(&parsed),
        [("Save/CharacterRecord.cs".into(), "API/Arch3dFile.cs".into())]
    );
}

#[test]
fn external_csharp_using_is_metadata() {
    let parsed = vec![csharp_module("src/App.cs", "MyApp.UI", &["System"])];
    let refs = resolve_references(&parsed);
    assert!(refs.edges.is_empty(), "no edge for an external namespace");
    assert!(refs.diagnostics.is_empty(), "no diagnostic for an external namespace");
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
fn test_module_bypassing_a_facade_is_not_a_violation() {
    let bounds = boundaries(
        &[
            ("src/foo.test.ts", "ui"),
            ("core/index.ts", "core"),
            ("core/store.ts", "core"),
        ],
        &["core/index.ts"],
        &[],
    );
    let mut edges = vec![edge("src/foo.test.ts", "core/store.ts")];
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

// ---- interface seams (Phase 10) ------------------------------------------

/// A `ParsedModule` that imports the given named symbols from `specifier`.
fn with_imports(path: &str, specifier: &str, names: &[&str]) -> ParsedModule {
    let imports = vec![ParsedImport {
        specifier: specifier.to_string(),
        kind: ImportKind::Named,
        names: names.iter().map(|n| (*n).to_string()).collect(),
        is_type_only: true,
        is_reexport: false,
    }];
    ParsedModule { path: path.to_string(), imports, ..Default::default() }
}

/// A `ParsedModule` that implements the given interface names.
fn with_implements(path: &str, ifaces: &[&str]) -> ParsedModule {
    let implements = ifaces.iter().map(|n| (*n).to_string()).collect();
    ParsedModule { path: path.to_string(), implements, ..Default::default() }
}

#[test]
fn cross_group_interface_pair_produces_seam_edge() {
    let parsed = vec![
        with_imports("ui/app.ts", "./contracts", &["IStorage"]),
        with_implements("core/store.ts", &["IStorage"]),
    ];
    let bounds = boundaries(
        &[("ui/app.ts", "ui"), ("core/store.ts", "core")],
        &[],
        &[],
    );
    let edges = classify_interface_seams(&parsed, &bounds, &BTreeSet::new());
    assert_eq!(edges.len(), 1);
    assert_eq!(edges[0].source, "ui/app.ts");
    assert_eq!(edges[0].target, "core/store.ts");
    assert_eq!(edges[0].kind, EdgeKind::Soft);
    assert_eq!(edges[0].trigger, "interface:IStorage");
    assert_eq!(edges[0].id, "ui/app.ts->core/store.ts:seam:0");
    assert!(!edges[0].is_violation);
}

#[test]
fn same_group_interface_pair_is_suppressed() {
    let parsed = vec![
        with_imports("core/a.ts", "./contracts", &["IStorage"]),
        with_implements("core/store.ts", &["IStorage"]),
    ];
    let bounds = boundaries(
        &[("core/a.ts", "core"), ("core/store.ts", "core")],
        &[],
        &[],
    );
    let edges = classify_interface_seams(&parsed, &bounds, &BTreeSet::new());
    assert!(edges.is_empty(), "same-group seam must not produce a dashed edge");
}

#[test]
fn seam_suppressed_when_direct_import_already_exists() {
    let parsed = vec![
        with_imports("ui/app.ts", "./contracts", &["IStorage"]),
        with_implements("core/store.ts", &["IStorage"]),
    ];
    let bounds = boundaries(
        &[("ui/app.ts", "ui"), ("core/store.ts", "core")],
        &[],
        &[],
    );
    let already: BTreeSet<(String, String)> =
        [("ui/app.ts".to_string(), "core/store.ts".to_string())].into();
    let edges = classify_interface_seams(&parsed, &bounds, &already);
    assert!(edges.is_empty(), "solid import edge makes seam redundant");
}

#[test]
fn unmatched_interface_name_produces_no_seam() {
    let parsed = vec![
        with_imports("ui/app.ts", "./contracts", &["IFoo"]),
        with_implements("core/store.ts", &["IBar"]),
    ];
    let bounds = boundaries(
        &[("ui/app.ts", "ui"), ("core/store.ts", "core")],
        &[],
        &[],
    );
    let edges = classify_interface_seams(&parsed, &bounds, &BTreeSet::new());
    assert!(edges.is_empty(), "different interface names must not match");
}

#[test]
fn two_interfaces_between_same_pair_get_incrementing_ordinals() {
    let parsed = vec![
        with_imports("ui/app.ts", "./contracts", &["IFoo", "IBar"]),
        with_implements("core/store.ts", &["IFoo", "IBar"]),
    ];
    let bounds = boundaries(
        &[("ui/app.ts", "ui"), ("core/store.ts", "core")],
        &[],
        &[],
    );
    let ids: Vec<String> =
        classify_interface_seams(&parsed, &bounds, &BTreeSet::new())
            .into_iter()
            .map(|e| e.id)
            .collect();
    assert_eq!(ids, [
        "ui/app.ts->core/store.ts:seam:0",
        "ui/app.ts->core/store.ts:seam:1",
    ]);
}

// ---- Tauri IPC seams -----------------------------------------------------

fn with_ipc_invokes(path: &str, commands: &[&str]) -> ParsedModule {
    ParsedModule {
        path: path.to_string(),
        ipc_invokes: commands.iter().map(|c| (*c).to_string()).collect(),
        ..Default::default()
    }
}

fn with_ipc_commands(path: &str, commands: &[&str]) -> ParsedModule {
    ParsedModule {
        path: path.to_string(),
        ipc_commands: commands.iter().map(|c| (*c).to_string()).collect(),
        ..Default::default()
    }
}

#[test]
fn invoke_and_command_pair_produces_ipc_edge() {
    let parsed = vec![
        with_ipc_invokes("src/ipc/client.ts", &["greet"]),
        with_ipc_commands("src-tauri/src/commands.rs", &["greet"]),
    ];
    let (edges, diagnostics) = classify_tauri_ipc(&parsed);
    assert!(diagnostics.is_empty());
    assert_eq!(edges.len(), 1);
    assert_eq!(edges[0].source, "src/ipc/client.ts");
    assert_eq!(edges[0].target, "src-tauri/src/commands.rs");
    assert_eq!(edges[0].trigger, "ipc:greet");
    assert_eq!(edges[0].id, "src/ipc/client.ts->src-tauri/src/commands.rs:ipc:0");
}

#[test]
fn orphan_invoke_produces_unresolved_ipc_diagnostic() {
    let parsed = vec![with_ipc_invokes("src/ipc/orphan.ts", &["missing_cmd"])];
    let (edges, diagnostics) = classify_tauri_ipc(&parsed);
    assert!(edges.is_empty());
    assert_eq!(diagnostics.len(), 1);
    assert_eq!(diagnostics[0].kind, crate::contract::DiagnosticKind::UnresolvedIpc);
    assert_eq!(diagnostics[0].module_id.as_deref(), Some("src/ipc/orphan.ts"));
}

#[test]
fn two_commands_between_same_pair_get_incrementing_ordinals() {
    let parsed = vec![
        with_ipc_invokes("src/ipc/client.ts", &["a", "b"]),
        with_ipc_commands("src-tauri/src/commands.rs", &["a", "b"]),
    ];
    let (edges, _) = classify_tauri_ipc(&parsed);
    let ids: Vec<String> = edges.into_iter().map(|e| e.id).collect();
    assert_eq!(ids, [
        "src/ipc/client.ts->src-tauri/src/commands.rs:ipc:0",
        "src/ipc/client.ts->src-tauri/src/commands.rs:ipc:1",
    ]);
}

