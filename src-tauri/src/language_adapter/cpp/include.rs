// @Architecture(descriptionShort="Preserves quoted #include paths for C++ resolution")

use tree_sitter::Node;

use crate::language_adapter::adapter_types::{ImportKind, ParsedImport, ParsedModule};

/// Record a quoted `#include "…"` as a side-effect dependency.
pub fn push_include(node: Node, src: &str, module: &mut ParsedModule) {
    let Some(specifier) = quoted_path(node, src) else {
        return;
    };
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

fn text_of<'a>(node: Node, src: &'a str) -> &'a str {
    node.utf8_text(src.as_bytes()).unwrap_or("")
}
