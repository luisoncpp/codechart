use std::collections::HashMap;

use crate::language_adapter::{registry_for_path, ImportKind, ParsedModule, SignalRole};
use crate::project_source::{MemoryProjectSource, ProjectSource};

fn parse(path: &str, source: &str) -> ParsedModule {
    let adapter = registry_for_path(path).expect("adapter for extension");
    adapter.parse(path, source).expect("parse succeeds")
}

fn specifiers(module: &ParsedModule) -> Vec<&str> {
    module.imports.iter().map(|i| i.specifier.as_str()).collect()
}

#[test]
fn default_import() {
    let m = parse("a.ts", r#"import X from "m";"#);
    assert_eq!(specifiers(&m), vec!["m"]);
    assert_eq!(m.imports[0].kind, ImportKind::Default);
    assert_eq!(m.imports[0].names, vec!["X"]);
}

#[test]
fn named_import_keeps_original_names() {
    let m = parse("a.ts", r#"import { a, b as c } from "./m";"#);
    assert_eq!(m.imports[0].kind, ImportKind::Named);
    assert_eq!(m.imports[0].names, vec!["a", "b"]);
    assert_eq!(specifiers(&m), vec!["./m"]);
}

#[test]
fn namespace_import() {
    let m = parse("a.ts", r#"import * as ns from "./m";"#);
    assert_eq!(m.imports[0].kind, ImportKind::Namespace);
    assert_eq!(m.imports[0].names, vec!["ns"]);
}

#[test]
fn type_only_import() {
    let m = parse("a.ts", r#"import type { T } from "./t";"#);
    assert!(m.imports[0].is_type_only);
    assert_eq!(m.imports[0].names, vec!["T"]);
}

#[test]
fn side_effect_import() {
    let m = parse("a.ts", r#"import "./setup";"#);
    assert_eq!(m.imports[0].kind, ImportKind::SideEffect);
    assert!(m.imports[0].names.is_empty());
    assert_eq!(specifiers(&m), vec!["./setup"]);
}

#[test]
fn mixed_default_and_named() {
    let m = parse("a.ts", r#"import D, { a } from "./m";"#);
    assert_eq!(m.imports[0].names, vec!["D", "a"]);
}

#[test]
fn reexport_named() {
    let m = parse("a.ts", r#"export { TodoStore } from "./store";"#);
    assert!(m.imports.is_empty());
    assert_eq!(m.reexports.len(), 1);
    assert!(m.reexports[0].is_reexport);
    assert_eq!(m.reexports[0].specifier, "./store");
    assert_eq!(m.reexports[0].names, vec!["TodoStore"]);
    assert_eq!(m.exported_symbols, vec!["TodoStore"]);
}

#[test]
fn reexport_type() {
    let m = parse("a.ts", r#"export type { Todo } from "./todo";"#);
    assert!(m.reexports[0].is_type_only);
    assert_eq!(m.reexports[0].names, vec!["Todo"]);
}

#[test]
fn reexport_star() {
    let m = parse("a.ts", r#"export * from "./all";"#);
    assert_eq!(m.reexports[0].kind, ImportKind::Namespace);
    assert!(m.reexports[0].names.is_empty());
    assert_eq!(m.reexports[0].specifier, "./all");
}

#[test]
fn local_exports() {
    let src = "export const a = 1;\n\
               export function f() {}\n\
               export class C {}\n\
               export interface I {}\n\
               export default f;";
    let m = parse("a.ts", src);
    assert_eq!(m.exported_symbols, vec!["a", "f", "C", "I", "default"]);
    assert!(m.reexports.is_empty());
}

#[test]
fn comments_are_captured() {
    let m = parse("a.ts", "// header\nimport X from \"m\";\n/* block */");
    let texts: Vec<&str> = m.comments.iter().map(|c| c.text.as_str()).collect();
    assert_eq!(texts, vec!["// header", "/* block */"]);
}

#[test]
fn tsx_with_jsx_parses_imports() {
    let src = r#"import { TodoList } from "./TodoList";
export function App() { return <TodoList />; }"#;
    let m = parse("App.tsx", src);
    assert_eq!(specifiers(&m), vec!["./TodoList"]);
    assert_eq!(m.exported_symbols, vec!["App"]);
}

// ---- communication signals (Phase 9 soft edges) -------------------------

#[test]
fn bare_emit_call_is_an_emit_signal() {
    let m = parse("a.ts", r#"emit("todos:changed");"#);
    assert_eq!(m.signals.len(), 1);
    assert_eq!(m.signals[0].role, SignalRole::Emit);
    assert_eq!(m.signals[0].token, "todos:changed");
}

#[test]
fn member_listen_call_is_a_listen_signal() {
    let m = parse("a.ts", r#"bus.on("ready", () => {});"#);
    assert_eq!(m.signals.len(), 1);
    assert_eq!(m.signals[0].role, SignalRole::Listen);
    assert_eq!(m.signals[0].token, "ready");
}

#[test]
fn signal_is_found_inside_a_method_body() {
    let src = "class S { add() { this.publish(\"changed\"); } }";
    let m = parse("a.ts", src);
    assert_eq!(m.signals.len(), 1);
    assert_eq!(m.signals[0].role, SignalRole::Emit);
    assert_eq!(m.signals[0].token, "changed");
}

#[test]
fn non_string_first_argument_is_not_a_signal() {
    let m = parse("a.ts", r#"emit(eventName); on(EVENTS.ready, cb);"#);
    assert!(m.signals.is_empty(), "tokens must be string literals");
}

#[test]
fn allowlisted_names_only() {
    let m = parse("a.ts", r#"compute("x"); render("y");"#);
    assert!(m.signals.is_empty(), "compute/render are not emit/listen");
}

#[test]
fn multiple_signals_kept_in_source_order() {
    let src = r#"emit("a"); bus.addEventListener("b", cb); dispatch("c");"#;
    let m = parse("a.ts", src);
    let tokens: Vec<&str> = m.signals.iter().map(|s| s.token.as_str()).collect();
    assert_eq!(tokens, vec!["a", "b", "c"]);
}

#[test]
fn unsupported_extension_has_no_adapter() {
    assert!(registry_for_path("a.cpp").is_none());
    assert!(registry_for_path("noext").is_none());
}

#[test]
fn parses_file_from_memory_source() {
    let mut files = HashMap::new();
    files.insert("src/a.ts".to_string(), r#"import { b } from "./b";"#.to_string());
    let source = MemoryProjectSource::new(files);

    let path = "src/a.ts";
    let text = source.read_file(path).unwrap();
    let m = parse(path, &text);
    assert_eq!(m.path, "src/a.ts");
    assert_eq!(specifiers(&m), vec!["./b"]);
}

#[test]
fn implements_clause_names_are_extracted() {
    let m = parse("a.ts", "class Foo implements IBar, IBaz<T> {}");
    assert_eq!(m.implements, vec!["IBar", "IBaz"]);
}

#[test]
fn class_without_implements_has_empty_implements() {
    let m = parse("a.ts", "class Foo extends Base {}");
    assert!(m.implements.is_empty());
}
