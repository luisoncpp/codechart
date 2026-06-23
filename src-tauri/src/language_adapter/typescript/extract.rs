// @Architecture(descriptionShort="Extracts imports, exports, and comments from TypeScript AST")

use tree_sitter::Node;

use crate::language_adapter::{CommentBlock, ImportKind, ParsedImport, ParsedModule};

pub fn walk_top_level(root: Node, src: &str, module: &mut ParsedModule) {
    let mut cursor = root.walk();
    for node in root.children(&mut cursor) {
        match node.kind() {
            "comment" => module.comments.push(comment_block(node, src)),
            "import_statement" => push_import(node, src, module),
            "export_statement" => push_export(node, src, module),
            _ => {}
        }
    }
}

fn comment_block(node: Node, src: &str) -> CommentBlock {
    CommentBlock {
        text: text_of(node, src).to_string(),
        start_byte: node.start_byte(),
        end_byte: node.end_byte(),
    }
}

fn push_import(node: Node, src: &str, module: &mut ParsedModule) {
    let Some(specifier) = source_specifier(node, src) else {
        return; // dynamic import / malformed — skipped for MVP
    };
    let (kind, names) = clause_names(node, src);
    module.imports.push(ParsedImport {
        specifier,
        kind,
        names,
        is_type_only: starts_with_typed(node, src, /*keyword=*/ "import"),
        is_reexport: false,
    });
}

fn push_export(node: Node, src: &str, module: &mut ParsedModule) {
    let names = export_clause_names(node, src);
    let Some(specifier) = source_specifier(node, src) else {
        collect_local_exports(node, src, module);
        return;
    };
    // `export ... from "m"` — a re-export (also a dependency edge).
    module.exported_symbols.extend(names.iter().cloned());
    let kind = if names.is_empty() { ImportKind::Namespace } else { ImportKind::Named };
    module.reexports.push(ParsedImport {
        specifier,
        kind,
        names,
        is_type_only: starts_with_typed(node, src, /*keyword=*/ "export"),
        is_reexport: true,
    });
}

/// The unquoted module specifier from an import/export `source` field.
fn source_specifier(node: Node, src: &str) -> Option<String> {
    let string_node = node.child_by_field_name("source")?;
    Some(text_of(string_node, src).trim_matches(['"', '\'', '`']).to_string())
}

/// Determine import kind + the symbol names introduced by the import clause.
fn clause_names(node: Node, src: &str) -> (ImportKind, Vec<String>) {
    let mut cursor = node.walk();
    let Some(clause) = node
        .children(&mut cursor)
        .find(|c| c.kind() == "import_clause")
    else {
        return (ImportKind::SideEffect, Vec::new()); // `import "m"`
    };
    classify_clause(clause, src)
}

fn classify_clause(clause: Node, src: &str) -> (ImportKind, Vec<String>) {
    let mut cursor = clause.walk();
    let mut names = Vec::new();
    let mut kind = ImportKind::SideEffect;
    for child in clause.children(&mut cursor) {
        match child.kind() {
            "identifier" => {
                names.push(text_of(child, src).to_string());
                kind = ImportKind::Default;
            }
            "namespace_import" => {
                push_specifier_names(child, src, &mut names);
                kind = ImportKind::Namespace;
            }
            "named_imports" => {
                push_specifier_names(child, src, &mut names);
                kind = ImportKind::Named;
            }
            _ => {}
        }
    }
    (kind, names)
}

/// Pull the original (pre-alias) identifier names out of a `named_imports`,
/// `namespace_import`, or `export_clause` node. For each
/// `import_specifier`/`export_specifier`, take the `name` field; for a bare
/// `namespace_import` (`* as ns`), take its trailing identifier.
fn push_specifier_names(node: Node, src: &str, names: &mut Vec<String>) {
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        match child.kind() {
            "import_specifier" | "export_specifier" => {
                if let Some(name) = child.child_by_field_name("name") {
                    names.push(text_of(name, src).to_string());
                }
            }
            "identifier" => names.push(text_of(child, src).to_string()),
            _ => {}
        }
    }
}

fn export_clause_names(node: Node, src: &str) -> Vec<String> {
    let mut cursor = node.walk();
    let Some(clause) = node
        .children(&mut cursor)
        .find(|c| c.kind() == "export_clause")
    else {
        return Vec::new();
    };
    let mut names = Vec::new();
    push_specifier_names(clause, src, &mut names);
    names
}

/// `export const/function/class/...` — record the declared names.
fn collect_local_exports(node: Node, src: &str, module: &mut ParsedModule) {
    let names = export_clause_names(node, src);
    if !names.is_empty() {
        module.exported_symbols.extend(names); // `export { a, b }`
        return;
    }
    let Some(decl) = node.child_by_field_name("declaration") else {
        if has_default_keyword(node, src) {
            module.exported_symbols.push("default".to_string());
        }
        return;
    };
    collect_declaration_names(decl, src, module);
}

fn collect_declaration_names(decl: Node, src: &str, module: &mut ParsedModule) {
    match decl.kind() {
        "lexical_declaration" | "variable_declaration" => {
            let mut cursor = decl.walk();
            for d in decl.children(&mut cursor).filter(|c| c.kind() == "variable_declarator") {
                if let Some(name) = d.child_by_field_name("name") {
                    module.exported_symbols.push(text_of(name, src).to_string());
                }
            }
        }
        _ => {
            if let Some(name) = decl.child_by_field_name("name") {
                module.exported_symbols.push(text_of(name, src).to_string());
            }
        }
    }
}

fn has_default_keyword(node: Node, src: &str) -> bool {
    text_of(node, src).trim_start().starts_with("export default")
}

/// True for `import type`/`export type` (whole-statement type-only forms).
fn starts_with_typed(node: Node, src: &str, keyword: &str) -> bool {
    let text = text_of(node, src);
    let rest = text.trim_start().strip_prefix(keyword);
    matches!(rest, Some(r) if r.trim_start().starts_with("type"))
}

fn text_of<'a>(node: Node, src: &'a str) -> &'a str {
    node.utf8_text(src.as_bytes()).unwrap_or("")
}
