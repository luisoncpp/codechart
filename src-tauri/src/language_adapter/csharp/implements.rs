// @Architecture(descriptionShort="Extracts interface names from C# base lists")

use tree_sitter::Node;

/// Collect interface/base names from `class`/`struct` `: Base, IFoo` lists.
pub fn collect_implements(root: Node, src: &str) -> Vec<String> {
    let mut names = Vec::new();
    walk(root, src, &mut names);
    names
}

fn walk(node: Node, src: &str, names: &mut Vec<String>) {
    if matches!(node.kind(), "class_declaration" | "struct_declaration") {
        push_base_list(node, src, names);
    }
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        walk(child, src, names);
    }
}

fn push_base_list(node: Node, src: &str, names: &mut Vec<String>) {
    let base_list = node
        .child_by_field_name("bases")
        .or_else(|| find_base_list(node));
    let Some(base_list) = base_list else {
        return;
    };
    let mut cursor = base_list.walk();
    for child in base_list.children(&mut cursor) {
        if child.kind() == "identifier" {
            names.push(text_of(child, src).to_string());
        }
    }
}

fn find_base_list(node: Node) -> Option<Node> {
    let mut cursor = node.walk();
    let found = node
        .children(&mut cursor)
        .find(|c| c.kind() == "base_list");
    found
}

fn text_of<'a>(node: Node, src: &'a str) -> &'a str {
    node.utf8_text(src.as_bytes()).unwrap_or("")
}
