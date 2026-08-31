// @Architecture(descriptionShort="Rust parent/child module pairing for cycle detection")

/// True when `a` and `b` are a directory module and one of its direct children.
///
/// Direct children are `D/name.rs` or `D/name/mod.rs` next to `D/mod.rs` /
/// `D/lib.rs` / `D/main.rs`. Grandchildren (e.g. `D/name/create.rs`) are not.
pub fn is_paired_rust_parent_child(a: &str, b: &str) -> bool {
    is_direct_rust_child(a, b) || is_direct_rust_child(b, a)
}

fn is_direct_rust_child(parent_file: &str, child: &str) -> bool {
    let Some(dir) = dir_module_dir(parent_file) else {
        return false;
    };
    is_file_module_in(dir, child) || is_nested_mod_in(dir, child)
}

fn dir_module_dir(path: &str) -> Option<&str> {
    path.strip_suffix("/mod.rs")
        .or_else(|| path.strip_suffix("/lib.rs"))
        .or_else(|| path.strip_suffix("/main.rs"))
        .or_else(|| match path {
            "mod.rs" | "lib.rs" | "main.rs" => Some(""),
            _ => None,
        })
}

fn is_file_module_in(dir: &str, child: &str) -> bool {
    let Some(rest) = strip_dir_prefix(dir, child) else {
        return false;
    };
    if matches!(rest, "mod.rs" | "lib.rs" | "main.rs") {
        return false;
    }
    rest.ends_with(".rs") && !rest.contains('/')
}

fn is_nested_mod_in(dir: &str, child: &str) -> bool {
    let Some(rest) = strip_dir_prefix(dir, child) else {
        return false;
    };
    let Some(inner) = rest.strip_suffix("/mod.rs") else {
        return false;
    };
    !inner.is_empty() && !inner.contains('/')
}

fn strip_dir_prefix<'a>(dir: &str, child: &'a str) -> Option<&'a str> {
    if dir.is_empty() {
        return Some(child);
    }
    child.strip_prefix(dir)?.strip_prefix('/')
}
