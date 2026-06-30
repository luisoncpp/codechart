use crate::language_adapter::adapter_types::{ImportKind, LanguageAdapter, ParsedModule};
use super::CppAdapter;

fn parse(path: &str, source: &str) -> ParsedModule {
    CppAdapter::new()
        .parse(path, source)
        .expect("parse succeeds")
}

fn specifiers(module: &ParsedModule) -> Vec<&str> {
    module.imports.iter().map(|i| i.specifier.as_str()).collect()
}

#[test]
fn quoted_include_becomes_relative_specifier() {
    let source = r#"#include "utils/helper.h"
"#;
    let m = parse("src/main.cpp", source);
    assert_eq!(specifiers(&m), vec!["./utils/helper.h"]);
    assert_eq!(m.imports[0].kind, ImportKind::SideEffect);
}

#[test]
fn parent_relative_include_is_preserved() {
    let source = r#"#include "../common/base.h"
"#;
    let m = parse("src/foo/main.cpp", source);
    assert_eq!(specifiers(&m), vec!["../common/base.h"]);
}

#[test]
fn system_include_is_ignored() {
    let source = "#include <vector>\n#include <iostream>\n";
    let m = parse("src/main.cpp", source);
    assert!(m.imports.is_empty());
}

#[test]
fn exports_class_and_function() {
    let source = r#"
class Engine {
public:
    void start();
};

void run();
"#;
    let m = parse("src/engine.h", source);
    assert_eq!(m.exported_symbols, vec!["Engine", "run"]);
}

#[test]
fn namespace_exports() {
    let source = r#"
namespace game {
    struct Player {};
    void tick();
}
"#;
    let m = parse("src/game.cpp", source);
    assert_eq!(m.exported_symbols, vec!["Player", "tick"]);
}

#[test]
fn class_inheritance_populates_implements() {
    let source = "class Dog : public Animal, IRunnable {};\n";
    let m = parse("src/dog.cpp", source);
    assert_eq!(m.implements, vec!["Animal", "IRunnable"]);
}

#[test]
fn captures_comments() {
    let m = parse("src/a.cpp", "// line\n/* block */\n");
    assert_eq!(m.comments.len(), 2);
}
