// @Architecture(descriptionShort="Extracts includes, namespaces, and exports from C++")

use tree_sitter::Node;

use crate::language_adapter::adapter_types::{CommentBlock, ParsedModule};

use super::include::push_include;

pub fn walk_translation_unit(root: Node, src: &str, module: &mut ParsedModule) {
    let mut cursor = root.walk();
    for node in root.children(&mut cursor) {
        walk_top_level(node, src, module);
    }
}

fn walk_top_level(node: Node, src: &str, module: &mut ParsedModule) {
    match node.kind() {
        "comment" => module.comments.push(comment_block(node, src)),
        "preproc_include" => push_include(node, src, module),
        "namespace_definition" => walk_namespace_body(node, src, module),
        "class_specifier" | "struct_specifier" | "enum_specifier" | "union_specifier" => {
            push_type_export(node, src, module);
        }
        "function_definition" => push_function_export(node, src, module),
        "declaration" => push_declaration_export(node, src, module),
        _ => {}
    }
}

fn walk_namespace_body(node: Node, src: &str, module: &mut ParsedModule) {
    let Some(body) = node.child_by_field_name("body") else {
        return;
    };
    let mut cursor = body.walk();
    for child in body.children(&mut cursor) {
        walk_top_level(child, src, module);
    }
}

fn push_type_export(node: Node, src: &str, module: &mut ParsedModule) {
    let Some(name) = node.child_by_field_name("name") else {
        return;
    };
    if name.kind() == "type_identifier" || name.kind() == "identifier" {
        module.exported_symbols.push(text_of(name, src).to_string());
    }
}

fn push_function_export(node: Node, src: &str, module: &mut ParsedModule) {
    let Some(decl) = node.child_by_field_name("declarator") else {
        return;
    };
    if let Some(name) = function_name(decl, src) {
        module.exported_symbols.push(name);
    }
}

fn push_declaration_export(node: Node, src: &str, module: &mut ParsedModule) {
    let Some(decl) = node.child_by_field_name("declarator") else {
        return;
    };
    if function_name(decl, src).is_some() {
        push_function_export(node, src, module);
    }
}

fn function_name(node: Node, src: &str) -> Option<String> {
    match node.kind() {
        "identifier" | "field_identifier" | "destructor_name" => {
            Some(text_of(node, src).to_string())
        }
        "function_declarator" | "pointer_declarator" | "reference_declarator"
        | "array_declarator" | "parenthesized_declarator" | "abstract_function_declarator" => {
            node.child_by_field_name("declarator")
                .and_then(|d| function_name(d, src))
        }
        "qualified_identifier" => node
            .child_by_field_name("name")
            .and_then(|n| function_name(n, src)),
        _ => None,
    }
}

fn comment_block(node: Node, src: &str) -> CommentBlock {
    CommentBlock {
        text: text_of(node, src).to_string(),
        start_byte: node.start_byte(),
        end_byte: node.end_byte(),
    }
}

fn text_of<'a>(node: Node, src: &'a str) -> &'a str {
    node.utf8_text(src.as_bytes()).unwrap_or("")
}
