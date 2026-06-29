// @Architecture(descriptionShort="Extracts Tauri invoke call sites from TypeScript")

use tree_sitter::Node;

use crate::language_adapter::adapter_types::ParsedImport;

/// Collect every `invoke("command")` call in the tree when the module imports
/// from `@tauri-apps/api`.
pub fn collect_ipc_invokes(root: Node, src: &str, imports: &[ParsedImport]) -> Vec<String> {
    if !has_tauri_import(imports) {
        return Vec::new();
    }
    let mut commands = Vec::new();
    walk(root, src, &mut commands);
    commands
}

/// True when the module imports from a `@tauri-apps/api` package path.
pub fn has_tauri_import(imports: &[ParsedImport]) -> bool {
    imports
        .iter()
        .any(|i| i.specifier.contains("@tauri-apps/api"))
}

fn walk(node: Node, src: &str, commands: &mut Vec<String>) {
    if node.kind() == "call_expression" {
        if let Some(command) = invoke_of(node, src) {
            commands.push(command);
        }
    }
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        walk(child, src, commands);
    }
}

/// A command name for `call_expression` whose callee is `invoke` and whose first
/// argument is a string literal, else `None`.
fn invoke_of(call: Node, src: &str) -> Option<String> {
    if callee_name(call, src)? != "invoke" {
        return None;
    }
    first_string_arg(call, src)
}

/// The called method/function name: a bare `identifier` callee, or the
/// `property` of a `member_expression` callee (`core.invoke(...)`).
fn callee_name<'a>(call: Node, src: &'a str) -> Option<&'a str> {
    let function = call.child_by_field_name("function")?;
    match function.kind() {
        "identifier" => Some(text_of(function, src)),
        "member_expression" => Some(text_of(function.child_by_field_name("property")?, src)),
        _ => None,
    }
}

/// The unquoted command from the call's first argument when it is a string literal.
fn first_string_arg(call: Node, src: &str) -> Option<String> {
    let args = call.child_by_field_name("arguments")?;
    let mut cursor = args.walk();
    let first = args.children(&mut cursor).find(|c| c.kind() != "(")?;
    if first.kind() != "string" {
        return None;
    }
    Some(text_of(first, src).trim_matches(['"', '\'', '`']).to_string())
}

fn text_of<'a>(node: Node, src: &'a str) -> &'a str {
    node.utf8_text(src.as_bytes()).unwrap_or("")
}
