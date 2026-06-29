use crate::language_adapter::adapter_types::ImportKind;

use super::CssAdapter;
use crate::language_adapter::LanguageAdapter;

fn parse(source: &str) -> crate::language_adapter::ParsedModule {
    CssAdapter::new()
        .parse("styles/main.css", source)
        .expect("parse css")
}

#[test]
fn parses_quoted_import() {
    let m = parse(r#"@import "./tokens.css";"#);
    assert_eq!(m.imports.len(), 1);
    assert_eq!(m.imports[0].specifier, "./tokens.css");
    assert_eq!(m.imports[0].kind, ImportKind::SideEffect);
}

#[test]
fn parses_url_import() {
    let m = parse(r#"@import url("./layout.css") layer(base);"#);
    assert_eq!(m.imports[0].specifier, "./layout.css");
}

#[test]
fn skips_external_imports() {
    let m = parse(r#"@import url("https://fonts.example.com/font.css");"#);
    assert!(m.imports.is_empty());
}

#[test]
fn ignores_comments() {
    let m = parse("/* @import \"./hidden.css\"; */\n@import './visible.css';");
    assert_eq!(m.imports.len(), 1);
    assert_eq!(m.imports[0].specifier, "./visible.css");
}
