// Top-level extraction for the Rust adapter.

use tree_sitter::Node;

use crate::language_adapter::{CommentBlock, ImportKind, ParsedImport, ParsedModule};

use super::path::{mod_specifier, use_module_paths, use_specifier};

pub fn walk_top_level(root: Node, src: &str, module: &mut ParsedModule) {
    let mut cursor = root.walk();
    for node in root.children(&mut cursor) {
        match node.kind() {
            "line_comment" | "block_comment" => module.comments.push(comment_block(node, src)),
            "use_declaration" => {
                let reexport = is_pub(node, src);
                push_use(node, src, module, reexport);
            }
            "mod_item" => push_mod(node, src, module),
            "function_item" | "struct_item" | "enum_item" | "trait_item" | "type_item"
            | "const_item" | "static_item" => {
                if is_pub(node, src) {
                    push_export_name(node, src, module);
                }
            }
            "foreign_mod_item" | "extern_crate_declaration" => {}
            _ => {}
        }
    }
}

fn push_use(node: Node, src: &str, module: &mut ParsedModule, is_reexport: bool) {
    let Some(argument) = node.child_by_field_name("argument") else {
        return;
    };
    let importer = &module.path;
    let mut names = Vec::new();
    let paths = use_module_paths(argument, src, &mut names);
    for (i, rust_path) in paths.iter().enumerate() {
        let import_names = import_names_for_path(i, &paths, &names);
        let specifier = use_specifier(importer, rust_path);
        if specifier.is_none() && import_names.is_empty() {
            continue;
        }
        let import = ParsedImport {
            specifier: specifier.unwrap_or_default(),
            kind: if import_names.is_empty() {
                ImportKind::SideEffect
            } else {
                ImportKind::Named
            },
            names: import_names,
            is_type_only: false,
            is_reexport,
        };
        if is_reexport {
            module.reexports.push(import);
        } else {
            module.imports.push(import);
        }
    }
    if is_reexport {
        extend_unique(&mut module.exported_symbols, &names);
    }
}

/// One path per list item shares the collected `names` by index; a single path keeps them all.
fn import_names_for_path(index: usize, paths: &[Vec<String>], names: &[String]) -> Vec<String> {
    if names.is_empty() {
        return Vec::new();
    }
    if paths.len() == 1 {
        return names.to_vec();
    }
    names.get(index).cloned().into_iter().collect()
}

fn extend_unique(dest: &mut Vec<String>, names: &[String]) {
    for name in names {
        if !dest.contains(name) {
            dest.push(name.clone());
        }
    }
}

fn push_mod(node: Node, src: &str, module: &mut ParsedModule) {
    let Some(name) = node.child_by_field_name("name") else {
        return;
    };
    if node.child_by_field_name("body").is_some() {
        return; // inline `mod foo { ... }` — no file edge
    }
    let child = text_of(name, src);
    let Some(specifier) = mod_specifier(&module.path, child) else {
        return;
    };
    module.imports.push(ParsedImport {
        specifier,
        kind: ImportKind::SideEffect,
        names: vec![child.to_string()],
        is_type_only: false,
        is_reexport: false,
    });
}

fn push_export_name(node: Node, src: &str, module: &mut ParsedModule) {
    if let Some(name) = node.child_by_field_name("name") {
        module.exported_symbols.push(text_of(name, src).to_string());
    }
}

fn is_pub(node: Node, src: &str) -> bool {
    let mut cursor = node.walk();
    let is_pub = node
        .children(&mut cursor)
        .any(|c| c.kind() == "visibility_modifier" && text_of(c, src).trim_start().starts_with("pub"));
    is_pub
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
