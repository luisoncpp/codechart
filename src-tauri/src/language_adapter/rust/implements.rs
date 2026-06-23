// @Architecture(descriptionShort="Extracts trait names from Rust impl Trait for Type blocks")

use tree_sitter::Node;

/// Collect every trait name in an `impl Trait for Type` in the tree.
/// e.g. `impl TodoStore for Foo` → `["TodoStore"]`.
pub fn collect_implements(root: Node, src: &str) -> Vec<String> {
    let mut names = Vec::new();
    walk(root, src, &mut names);
    names
}

fn walk(node: Node, src: &str, names: &mut Vec<String>) {
    if node.kind() == "impl_item" {
        if let Some(trait_node) = node.child_by_field_name("trait") {
            push_trait_name(trait_node, src, names);
        }
    }
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        walk(child, src, names);
    }
}

fn push_trait_name(node: Node, src: &str, names: &mut Vec<String>) {
    match node.kind() {
        "type_identifier" => names.push(text_of(node, src).to_string()),
        "generic_type" => {
            if let Some(name_node) = node.child_by_field_name("name") {
                names.push(text_of(name_node, src).to_string());
            }
        }
        "scoped_type_identifier" => {
            if let Some(name_node) = node.child_by_field_name("name") {
                names.push(text_of(name_node, src).to_string());
            }
        }
        _ => {}
    }
}

fn text_of<'a>(node: Node, src: &'a str) -> &'a str {
    node.utf8_text(src.as_bytes()).unwrap_or("")
}
