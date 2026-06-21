// Extract interface names from `implements` clauses in class declarations
// (Phase 10, spec §2.4 cross-group decoupling interfaces).
//
// Tree-sitter shape: class_declaration → class_heritage → implements_clause
// → type_identifier | generic_type(name: type_identifier).
// Recurses the full tree so nested classes are also captured.

use tree_sitter::Node;

/// Collect every interface name in an `implements` clause in the tree.
/// e.g. `class Foo implements IBar, IBaz<T>` → `["IBar", "IBaz"]`.
pub fn collect_implements(root: Node, src: &str) -> Vec<String> {
    let mut names = Vec::new();
    walk(root, src, &mut names);
    names
}

fn walk(node: Node, src: &str, names: &mut Vec<String>) {
    if node.kind() == "implements_clause" {
        push_clause_names(node, src, names);
    }
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        walk(child, src, names);
    }
}

fn push_clause_names(clause: Node, src: &str, names: &mut Vec<String>) {
    let mut cursor = clause.walk();
    for child in clause.children(&mut cursor) {
        match child.kind() {
            "type_identifier" => names.push(text_of(child, src).to_string()),
            "generic_type" => {
                if let Some(name_node) = child.child_by_field_name("name") {
                    names.push(text_of(name_node, src).to_string());
                }
            }
            _ => {}
        }
    }
}

fn text_of<'a>(node: Node, src: &'a str) -> &'a str {
    node.utf8_text(src.as_bytes()).unwrap_or("")
}
