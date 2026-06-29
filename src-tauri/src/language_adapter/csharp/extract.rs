// @Architecture(descriptionShort="Extracts usings, namespaces, and exports from C#")

use tree_sitter::Node;

use crate::language_adapter::adapter_types::{CommentBlock, ImportKind, ParsedImport, ParsedModule};

pub fn walk_compilation_unit(root: Node, src: &str, module: &mut ParsedModule) {
    let mut cursor = root.walk();
    for node in root.children(&mut cursor) {
        walk_top_level(node, src, module);
    }
}

fn walk_top_level(node: Node, src: &str, module: &mut ParsedModule) {
    match node.kind() {
        "comment" => module.comments.push(comment_block(node, src)),
        "using_directive" | "global_using_directive" => push_using(node, src, module),
        "file_scoped_namespace_declaration" => {
            module.declared_namespace = Some(namespace_name(node, src));
        }
        "namespace_declaration" => {
            if module.declared_namespace.is_none() {
                module.declared_namespace = Some(namespace_name(node, src));
            }
            walk_namespace_body(node, src, module);
        }
        "class_declaration" | "interface_declaration" | "struct_declaration"
        | "enum_declaration" | "record_declaration" | "delegate_declaration" => {
            push_public_export(node, src, module);
        }
        _ => {}
    }
}

fn walk_namespace_body(node: Node, src: &str, module: &mut ParsedModule) {
    let Some(body) = node.child_by_field_name("body") else {
        return;
    };
    let mut cursor = body.walk();
    for child in body.children(&mut cursor) {
        match child.kind() {
            "class_declaration" | "interface_declaration" | "struct_declaration"
            | "enum_declaration" | "record_declaration" | "delegate_declaration" => {
                push_public_export(child, src, module);
            }
            _ => {}
        }
    }
}

fn push_using(node: Node, src: &str, module: &mut ParsedModule) {
    let mut cursor = node.walk();
    let children: Vec<Node> = node.children(&mut cursor).collect();
    let is_alias = children.iter().any(|c| c.kind() == "=");
    let is_static = children.iter().any(|c| c.kind() == "static");
    let specifier = using_specifier(&children, src, is_alias);
    let Some(specifier) = specifier else {
        return;
    };
    let names = alias_name(&children, src, is_alias);
    let kind = if !names.is_empty() {
        ImportKind::Named
    } else if is_static {
        ImportKind::Namespace
    } else {
        ImportKind::SideEffect
    };
    module.imports.push(ParsedImport {
        specifier,
        kind,
        names,
        is_type_only: false,
        is_reexport: false,
    });
}

fn using_specifier(children: &[Node], src: &str, is_alias: bool) -> Option<String> {
    if is_alias {
        return children
            .iter()
            .find(|c| c.kind() == "qualified_name")
            .map(|n| text_of(*n, src).to_string());
    }
    children.iter().find_map(|child| match child.kind() {
        "qualified_name" | "identifier" => Some(text_of(*child, src).to_string()),
        _ => None,
    })
}

fn alias_name(children: &[Node], src: &str, is_alias: bool) -> Vec<String> {
    if !is_alias {
        return Vec::new();
    }
    let Some(_alias) = children.iter().find(|c| c.kind() == "identifier") else {
        return Vec::new();
    };
    let target = children
        .iter()
        .find(|c| c.kind() == "qualified_name")
        .map(|n| text_of(*n, src))
        .unwrap_or("");
    vec![final_segment(target)]
}

fn push_public_export(node: Node, src: &str, module: &mut ParsedModule) {
    if !is_public(node, src) {
        return;
    }
    let Some(name) = node.child_by_field_name("name") else {
        return;
    };
    module.exported_symbols.push(text_of(name, src).to_string());
}

fn namespace_name(node: Node, src: &str) -> String {
    node.children(&mut node.walk())
        .find(|c| c.kind() == "qualified_name" || c.kind() == "identifier")
        .map(|n| text_of(n, src).to_string())
        .unwrap_or_default()
}

fn is_public(node: Node, src: &str) -> bool {
    node.children(&mut node.walk()).any(|c| {
        c.kind() == "modifier" && text_of(c, src).trim() == "public"
    })
}

fn final_segment(path: &str) -> String {
    path.rsplit('.').next().unwrap_or(path).to_string()
}

fn comment_block(node: Node, src: &str) -> CommentBlock {
    CommentBlock {
        text: text_of(node, src).to_string(),
        start_byte: node.start_byte(),
        end_byte: node.end_byte(),
    }
}

fn text_of<'a>(node: Node<'a>, src: &'a str) -> &'a str {
    node.utf8_text(src.as_bytes()).unwrap_or("")
}
