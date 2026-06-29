use std::collections::{BTreeMap, BTreeSet};

use crate::contract::EdgeKind;
use crate::language_adapter::adapter_types::{ImportKind, LanguageAdapter, ParsedModule};
use super::RustAdapter;
use crate::references::{classify_interface_seams, GroupBoundaries};

fn parse(path: &str, source: &str) -> ParsedModule {
    RustAdapter::new()
        .parse(path, source)
        .expect("parse succeeds")
}

fn specifiers(module: &ParsedModule) -> Vec<&str> {
    module.imports.iter().map(|i| i.specifier.as_str()).collect()
}

fn relative_specifiers(module: &ParsedModule) -> Vec<&str> {
    module
        .imports
        .iter()
        .filter(|i| i.specifier.starts_with('.'))
        .map(|i| i.specifier.as_str())
        .collect()
}

fn seam_bounds(members: &[(&str, &str)]) -> GroupBoundaries {
    let module_group: BTreeMap<String, String> =
        members.iter().map(|(m, g)| ((*m).into(), (*g).into())).collect();
    GroupBoundaries {
        module_group,
        parent_of: BTreeMap::new(),
        faceted_groups: BTreeSet::new(),
        facades: BTreeSet::new(),
    }
}

#[test]
fn mod_declaration() {
    let m = parse("src/lib.rs", "mod analysis;\n");
    assert_eq!(specifiers(&m), vec!["./analysis"]);
    assert_eq!(m.imports[0].kind, ImportKind::SideEffect);
}

#[test]
fn use_crate_path() {
    let source = "use crate::contract::types::Language;\n";
    let m = parse("src-tauri/src/analysis/mod.rs", source);
    assert_eq!(specifiers(&m), vec!["../contract/types"]);
}

#[test]
fn use_crate_path_from_nested_adapter_module() {
    let source = "use crate::language_adapter::adapter_types::{CommentBlock, ImportKind, ParsedImport, ParsedModule};\n";
    let m = parse("src-tauri/src/language_adapter/typescript/extract.rs", source);
    let specs = specifiers(&m);
    assert_eq!(specs.len(), 4);
    assert!(specs.iter().all(|s| *s == "../adapter_types"));
}

#[test]
fn use_super_path() {
    let source = "use super::other;\n";
    let m = parse("src/foo/bar.rs", source);
    assert_eq!(specifiers(&m), vec!["./other"]);
}

#[test]
fn use_self_path() {
    let m = parse("src/foo/mod.rs", "use self::bar::Baz;\n");
    assert_eq!(specifiers(&m), vec!["./bar"]);
}

#[test]
fn pub_exports() {
    let source = r#"
pub fn run() {}
pub struct Adapter;
pub enum Kind { A }
"#;
    let m = parse("src/adapter.rs", source);
    assert_eq!(m.exported_symbols, vec!["run", "Adapter", "Kind"]);
}

#[test]
fn pub_use_list_reexports_each_symbol_once() {
    let source = r#"
pub use builder::ProjectGraphBuilder;
pub use validate::BuildError;
pub use types::{ Alpha, Beta, Gamma };
"#;
    let m = parse("src-tauri/src/contract/mod.rs", source);
    assert_eq!(
        m.exported_symbols,
        vec!["ProjectGraphBuilder", "BuildError", "Alpha", "Beta", "Gamma"]
    );
    assert_eq!(m.reexports.len(), 5);
    assert_eq!(m.reexports[2].names, vec!["Alpha"]);
    assert_eq!(m.reexports[4].names, vec!["Gamma"]);
}

#[test]
fn captures_comments() {
    let m = parse("src/a.rs", "// line\n/* block */\n");
    assert_eq!(m.comments.len(), 2);
}

#[test]
fn trait_impl_names_are_extracted() {
    let m = parse("core/store.rs", "impl TodoStore for TodoStoreImpl {}\n");
    assert_eq!(m.implements, vec!["TodoStore"]);
}

#[test]
fn scoped_trait_impl_uses_final_segment() {
    let m = parse(
        "core/store.rs",
        "impl crate::services::TodoStore for Foo {}\n",
    );
    assert_eq!(m.implements, vec!["TodoStore"]);
}

#[test]
fn inherent_impl_has_empty_implements() {
    let m = parse("core/store.rs", "impl Foo {}\n");
    assert!(m.implements.is_empty());
}

#[test]
fn use_path_records_uppercase_type_name() {
    let m = parse("src/ui/app.rs", "use crate::contract::TodoStore;\n");
    assert_eq!(m.imports[0].names, vec!["TodoStore"]);
    assert_eq!(m.imports[0].kind, ImportKind::Named);
}

#[test]
fn rust_trait_seam_across_groups() {
    let parsed = vec![
        parse("src/ui/app.rs", "use crate::services::TodoStore;\n"),
        parse("src/core/store.rs", "impl TodoStore for TodoStoreImpl {}\n"),
    ];
    let bounds = seam_bounds(&[("src/ui/app.rs", "ui"), ("src/core/store.rs", "core")]);
    let edges = classify_interface_seams(&parsed, &bounds, &BTreeSet::new());
    assert_eq!(edges.len(), 1);
    assert_eq!(edges[0].source, "src/ui/app.rs");
    assert_eq!(edges[0].target, "src/core/store.rs");
    assert_eq!(edges[0].kind, EdgeKind::Soft);
    assert_eq!(edges[0].trigger, "interface:TodoStore");
}

#[test]
fn tauri_command_attribute_is_recorded() {
    let src = r#"
#[tauri::command]
pub fn greet(name: String) -> String {
    format!("Hello, {name}")
}
"#;
    let m = parse("src-tauri/src/commands.rs", src);
    assert_eq!(m.ipc_commands, vec!["greet"]);
}

#[test]
fn external_crate_use_has_no_relative_specifier() {
    let m = parse(
        "src-tauri/src/language_adapter/rust/mod.rs",
        "use tree_sitter::Parser;\n",
    );
    assert!(relative_specifiers(&m).is_empty());
}

#[test]
fn std_use_has_no_relative_specifier() {
    let m = parse(
        "src-tauri/src/grouping/mod.rs",
        "use std::collections::BTreeSet;\n",
    );
    assert!(relative_specifiers(&m).is_empty());
}

#[test]
fn bare_sibling_pub_use_resolves_to_module() {
    let source = "mod adapter_types;\npub use adapter_types::CommSignal;\n";
    let m = parse("src-tauri/src/language_adapter/mod.rs", source);
    let reexport_specs: Vec<_> = m.reexports.iter().map(|i| i.specifier.as_str()).collect();
    assert_eq!(reexport_specs, vec!["./adapter_types"]);
}

#[test]
fn bare_local_use_resolves_to_sibling_module() {
    let source = "mod claim;\nuse claim::{assign_modules, facades_for};\n";
    let m = parse("src-tauri/src/grouping/mod.rs", source);
    assert_eq!(
        specifiers(&m),
        vec!["./claim", "./claim/assign_modules", "./claim/facades_for"]
    );
}

#[test]
fn plain_function_has_no_ipc_commands() {
    let m = parse("src/lib.rs", "pub fn run() {}\n");
    assert!(m.ipc_commands.is_empty());
}

