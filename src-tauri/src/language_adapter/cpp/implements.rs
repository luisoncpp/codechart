// @Architecture(descriptionShort="Extracts base-class names from C++ class declarations")

use tree_sitter::Node;

/// Collect base-class / interface names from `: Base, IFoo` lists.
pub fn collect_implements(root: Node, src: &str) -> Vec<String> {
    let mut names = Vec::new();
    walk(root, src, &mut names);
    names
}

fn walk(node: Node, src: &str, names: &mut Vec<String>) {
    if node.kind() == "class_specifier" {
        push_base_list(node, src, names);
    }
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        walk(child, src, names);
    }
}

fn push_base_list(node: Node, src: &str, names: &mut Vec<String>) {
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        if child.kind() != "base_class_clause" {
            continue;
        }
        let mut inner = child.walk();
        for base in child.children(&mut inner) {
            if base.kind() == "type_identifier" {
                names.push(text_of(base, src).to_string());
            }
        }
    }
}

fn text_of<'a>(node: Node, src: &'a str) -> &'a str {
    node.utf8_text(src.as_bytes()).unwrap_or("")
}
