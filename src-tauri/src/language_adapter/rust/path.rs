// Rust `use` trees → module path segments.

use tree_sitter::Node;

pub use super::locate::{mod_specifier, use_specifier};

/// Collect module dependency paths from a `use` argument node.
pub fn use_module_paths(node: Node, src: &str, names: &mut Vec<String>) -> Vec<Vec<String>> {
    match node.kind() {
        "use_as_clause" => {
            if let Some(alias) = node.child_by_field_name("alias") {
                names.push(text_of(alias, src).to_string());
            }
            path_from_clause(node.child_by_field_name("path"), src)
                .into_iter()
                .collect()
        }
        "use_wildcard" => path_from_clause(node.child_by_field_name("path"), src)
            .into_iter()
            .collect(),
        "use_list" | "scoped_use_list" => {
            let prefix = node
                .child_by_field_name("path")
                .map(|p| path_segments(p, src));
            collect_list_paths(node, src, prefix.as_deref(), names)
        }
        _ => {
            let segs = path_segments(node, src);
            if segs.is_empty() { vec![] } else { vec![segs] }
        }
    }
}

fn collect_list_paths(
    node: Node,
    src: &str,
    prefix: Option<&[String]>,
    names: &mut Vec<String>,
) -> Vec<Vec<String>> {
    let list = node.child_by_field_name("list").unwrap_or(node);
    let mut paths = Vec::new();
    let mut cursor = list.walk();
    for child in list.children(&mut cursor) {
        match child.kind() {
            "use_as_clause" | "use_wildcard" | "identifier" | "scoped_identifier" => {
                let segs = path_segments(child, src);
                paths.push(merge_prefix(prefix, &segs));
                if let Some(alias) = child.child_by_field_name("alias") {
                    names.push(text_of(alias, src).to_string());
                }
            }
            "use_list" => paths.extend(collect_list_paths(child, src, prefix, names)),
            _ => {}
        }
    }
    if paths.is_empty() {
        return prefix.map(|p| vec![p.to_vec()]).unwrap_or_default();
    }
    paths
}

fn path_from_clause(path: Option<Node>, src: &str) -> Option<Vec<String>> {
    path.and_then(|p| {
        let segs = path_segments(p, src);
        if segs.is_empty() { None } else { Some(segs) }
    })
}

fn merge_prefix(prefix: Option<&[String]>, segs: &[String]) -> Vec<String> {
    let mut out = prefix.unwrap_or(&[]).to_vec();
    out.extend(segs.iter().cloned());
    out
}

fn path_segments(node: Node, src: &str) -> Vec<String> {
    match node.kind() {
        "identifier" => vec![text_of(node, src).to_string()],
        "self" => vec!["self".to_string()],
        "super" => vec!["super".to_string()],
        "crate" => vec!["crate".to_string()],
        "scoped_identifier" => {
            let mut segs = node
                .child_by_field_name("path")
                .map(|p| path_segments(p, src))
                .unwrap_or_default();
            if let Some(name) = node.child_by_field_name("name") {
                segs.push(text_of(name, src).to_string());
            }
            segs
        }
        "use_as_clause" => node
            .child_by_field_name("path")
            .map(|p| path_segments(p, src))
            .unwrap_or_default(),
        _ => Vec::new(),
    }
}

fn text_of<'a>(node: Node, src: &'a str) -> &'a str {
    node.utf8_text(src.as_bytes()).unwrap_or("")
}
