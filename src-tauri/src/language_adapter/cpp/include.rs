// @Architecture(descriptionShort="Turns quoted #include paths into relative specifiers")

use tree_sitter::Node;

use crate::language_adapter::adapter_types::{ImportKind, ParsedImport, ParsedModule};

/// Record a local `#include "…"` as a side-effect dependency edge.
pub fn push_include(node: Node, src: &str, module: &mut ParsedModule) {
    let Some(raw) = quoted_path(node, src) else {
        return;
    };
    let specifier = relative_specifier(&raw);
    module.imports.push(ParsedImport {
        specifier,
        kind: ImportKind::SideEffect,
        names: Vec::new(),
        is_type_only: false,
        is_reexport: false,
    });
}

fn quoted_path(node: Node, src: &str) -> Option<String> {
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        if child.kind() != "string_literal" {
            continue;
        }
        let text = text_of(child, src).trim();
        return Some(text.trim_matches('"').to_string());
    }
    None
}

fn relative_specifier(path: &str) -> String {
    if path.starts_with('.') {
        path.to_string()
    } else {
        format!("./{path}")
    }
}

fn text_of<'a>(node: Node, src: &'a str) -> &'a str {
    node.utf8_text(src.as_bytes()).unwrap_or("")
}
