// @Architecture(descriptionShort="Collects type names referenced in C# source")

use std::collections::BTreeSet;

use tree_sitter::Node;

/// Unqualified and fully-qualified type names used in the file body.
pub fn collect_referenced_symbols(root: Node, src: &str) -> Vec<String> {
    let mut names = BTreeSet::new();
    walk(root, src, &mut names);
    names.into_iter().collect()
}

fn walk(node: Node, src: &str, names: &mut BTreeSet<String>) {
    if matches!(node.kind(), "using_directive" | "global_using_directive") {
        return;
    }
    record_type(node, src, names);
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        walk(child, src, names);
    }
}

fn record_type(node: Node, src: &str, names: &mut BTreeSet<String>) {
    if is_declaration_name(node) {
        return;
    }
    if node.kind() == "type_identifier" || node.kind() == "identifier" && is_under_type_field(node) {
        names.insert(text_of(node, src).to_string());
        return;
    }
    if node.kind() == "qualified_name" && is_type_context(node) {
        let text = text_of(node, src).to_string();
        names.insert(final_segment(&text));
        names.insert(text);
        return;
    }
    if node.kind() == "identifier" && is_base_list_name(node) {
        names.insert(text_of(node, src).to_string());
    }
}

fn is_declaration_name(node: Node) -> bool {
    let Some(parent) = node.parent() else {
        return false;
    };
    if parent.child_by_field_name("name") != Some(node) {
        return false;
    }
    matches!(
        parent.kind(),
        "class_declaration"
            | "interface_declaration"
            | "struct_declaration"
            | "enum_declaration"
            | "record_declaration"
            | "delegate_declaration"
            | "namespace_declaration"
            | "file_scoped_namespace_declaration"
            | "method_declaration"
            | "property_declaration"
            | "field_declaration"
            | "event_declaration"
    )
}

fn is_type_context(node: Node) -> bool {
    if is_under_type_field(node) {
        return true;
    }
    node.parent().is_some_and(|p| p.kind() == "base_list")
}

fn is_under_type_field(node: Node) -> bool {
    let mut current = Some(node);
    while let Some(n) = current {
        if let Some(parent) = n.parent() {
            if parent.child_by_field_name("type") == Some(n) {
                return true;
            }
            if matches!(
                parent.kind(),
                "class_declaration"
                    | "interface_declaration"
                    | "struct_declaration"
                    | "method_declaration"
            ) {
                return false;
            }
            current = Some(parent);
        } else {
            return false;
        }
    }
    false
}

fn is_base_list_name(node: Node) -> bool {
    node.parent().is_some_and(|p| p.kind() == "base_list")
}

fn final_segment(path: &str) -> String {
    path.rsplit('.').next().unwrap_or(path).to_string()
}

fn text_of<'a>(node: Node<'a>, src: &'a str) -> &'a str {
    node.utf8_text(src.as_bytes()).unwrap_or("")
}
