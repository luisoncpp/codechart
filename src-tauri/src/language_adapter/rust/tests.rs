use crate::language_adapter::{registry_for_path, ImportKind, ParsedModule};

fn parse(path: &str, source: &str) -> ParsedModule {
    let adapter = registry_for_path(path).expect("adapter for extension");
    adapter.parse(path, source).expect("parse succeeds")
}

fn specifiers(module: &ParsedModule) -> Vec<&str> {
    module.imports.iter().map(|i| i.specifier.as_str()).collect()
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
fn captures_comments() {
    let m = parse("src/a.rs", "// line\n/* block */\n");
    assert_eq!(m.comments.len(), 2);
}

#[test]
fn registry_includes_rs() {
    assert!(registry_for_path("main.rs").is_some());
    assert!(registry_for_path("a.cpp").is_none());
}
