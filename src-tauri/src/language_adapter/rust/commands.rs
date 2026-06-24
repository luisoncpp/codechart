// @Architecture(descriptionShort="Extracts Tauri command handlers from Rust function items")

use tree_sitter::Node;

/// Collect every `#[tauri::command]` function name in the tree, in source order.
pub fn collect_ipc_commands(root: Node, src: &str) -> Vec<String> {
    let mut commands = Vec::new();
    walk_scopes(root, src, &mut commands);
    commands
}

fn walk_scopes(node: Node, src: &str, commands: &mut Vec<String>) {
    if is_item_container(node.kind()) {
        scan_siblings(node, src, commands);
    }
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        walk_scopes(child, src, commands);
    }
}

fn is_item_container(kind: &str) -> bool {
    matches!(kind, "source_file" | "declaration_list")
}

/// In tree-sitter-rust, outer attributes are sibling statements before the item.
fn scan_siblings(container: Node, src: &str, commands: &mut Vec<String>) {
    let mut pending_tauri = false;
    let mut cursor = container.walk();
    for child in container.children(&mut cursor) {
        match child.kind() {
            "attribute_item" if is_tauri_command_attr(child, src) => pending_tauri = true,
            "attribute_item" | "inner_attribute_item" => pending_tauri = false,
            "function_item" => {
                if pending_tauri {
                    if let Some(name) = child.child_by_field_name("name") {
                        commands.push(text_of(name, src).to_string());
                    }
                    pending_tauri = false;
                }
            }
            kind if is_declaration_item(kind) => pending_tauri = false,
            _ => {}
        }
    }
}

fn is_tauri_command_attr(attr: Node, src: &str) -> bool {
    text_of(attr, src).contains("tauri::command")
}

fn is_declaration_item(kind: &str) -> bool {
    matches!(
        kind,
        "function_item"
            | "mod_item"
            | "struct_item"
            | "const_item"
            | "enum_item"
            | "trait_item"
            | "impl_item"
            | "use_declaration"
            | "macro_invocation"
            | "macro_definition"
            | "type_item"
            | "static_item"
            | "foreign_mod_item"
    )
}

fn text_of<'a>(node: Node, src: &'a str) -> &'a str {
    node.utf8_text(src.as_bytes()).unwrap_or("")
}
