use crate::language_adapter::{registry_for_path, ImportKind, ParsedModule};

fn parse(path: &str, source: &str) -> ParsedModule {
    let adapter = registry_for_path(path).expect("adapter for extension");
    adapter.parse(path, source).expect("parse succeeds")
}

fn specifiers(module: &ParsedModule) -> Vec<&str> {
    module.imports.iter().map(|i| i.specifier.as_str()).collect()
}

#[test]
fn registry_includes_cs() {
    assert!(registry_for_path("Program.cs").is_some());
    assert!(registry_for_path("a.cpp").is_none());
}

#[test]
fn plain_using_records_namespace() {
    let m = parse("src/App.cs", "using System;\n");
    assert_eq!(specifiers(&m), vec!["System"]);
    assert_eq!(m.imports[0].kind, ImportKind::SideEffect);
}

#[test]
fn alias_using_records_type_name() {
    let source = "using IStorage = MyApp.Contracts.IStorage;\n";
    let m = parse("src/App.cs", source);
    assert_eq!(specifiers(&m), vec!["MyApp.Contracts.IStorage"]);
    assert_eq!(m.imports[0].names, vec!["IStorage"]);
}

#[test]
fn file_scoped_namespace() {
    let source = "namespace MyApp.Services;\npublic class Store {}\n";
    let m = parse("src/Store.cs", source);
    assert_eq!(m.declared_namespace.as_deref(), Some("MyApp.Services"));
    assert_eq!(m.exported_symbols, vec!["Store"]);
}

#[test]
fn block_namespace_exports() {
    let source = r#"
namespace MyApp.Services {
    public interface IRepo {}
    public class Store {}
}
"#;
    let m = parse("src/Store.cs", source);
    assert_eq!(m.declared_namespace.as_deref(), Some("MyApp.Services"));
    assert_eq!(m.exported_symbols, vec!["IRepo", "Store"]);
}

#[test]
fn class_base_list_implements() {
    let source = "public class Store : IStorage, IDisposable {}\n";
    let m = parse("src/Store.cs", source);
    assert_eq!(m.implements, vec!["IStorage", "IDisposable"]);
}

#[test]
fn captures_comments() {
    let m = parse("src/A.cs", "// line\n/* block */\n");
    assert_eq!(m.comments.len(), 2);
}

#[test]
fn global_using_is_recorded() {
    let m = parse("GlobalUsings.cs", "global using MyApp.Services;\n");
    assert_eq!(specifiers(&m), vec!["MyApp.Services"]);
}

#[test]
fn collects_type_references_from_source() {
    let source = r#"
using MyApp.Arena2;
namespace MyApp.Save;
public class CharacterRecord {
    Arch3dFile file;
    BioFile bio;
}
"#;
    let m = parse("Save/CharacterRecord.cs", source);
    assert!(m.referenced_symbols.contains(&"Arch3dFile".to_string()));
    assert!(m.referenced_symbols.contains(&"BioFile".to_string()));
}

#[test]
fn collects_base_list_interfaces_as_referenced_symbols() {
    let source = "public class Store : IStorage {}\n";
    let m = parse("src/Store.cs", source);
    assert_eq!(m.referenced_symbols, vec!["IStorage"]);
}
