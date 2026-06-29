// @Architecture(descriptionShort="Maps Rust module paths to graph-relative import specifiers")

pub fn mod_specifier(importer: &str, child: &str) -> Option<String> {
    let base = self_module_base(importer)?;
    Some(relative_specifier(parent_dir(importer), &format!("{base}/{child}")))
}

pub fn use_specifier(
    importer: &str,
    segments: &[String],
    local_mods: &[String],
) -> Option<String> {
    if segments.is_empty() || is_built_in_external(&segments[0]) {
        return None;
    }
    if !is_crate_scoped(segments) && !local_mods.contains(&segments[0]) {
        return None;
    }
    let segments = trim_item_segment(segments.to_vec());
    if segments.is_empty() {
        return None;
    }
    let target = resolve_segments(importer, &segments)?;
    Some(relative_specifier(parent_dir(importer), &target))
}

fn resolve_segments(importer: &str, segments: &[String]) -> Option<String> {
    match segments[0].as_str() {
        "crate" => {
            let root = crate_root_dir(importer)?;
            Some(join_path(&root, &segments[1..]))
        }
        "self" => {
            let base = self_module_base(importer)?;
            Some(join_path(&base, &segments[1..]))
        }
        "super" => {
            let parent = super_module_base(importer)?;
            Some(join_path(&parent, &segments[1..]))
        }
        _ => {
            let base = self_module_base(importer)?;
            Some(join_path(&base, segments))
        }
    }
}

fn self_module_base(importer: &str) -> Option<String> {
    if importer.ends_with("/mod.rs") {
        importer.strip_suffix("/mod.rs").map(str::to_string)
    } else if importer.ends_with("/lib.rs") || importer.ends_with("/main.rs") {
        Some(parent_dir(importer).to_string())
    } else {
        importer.strip_suffix(".rs").map(str::to_string)
    }
}

fn is_crate_scoped(segments: &[String]) -> bool {
    matches!(segments.first().map(String::as_str), Some("crate" | "self" | "super"))
}

fn is_built_in_external(root: &str) -> bool {
    matches!(root, "std" | "core" | "alloc" | "proc_macro" | "test")
}

fn trim_item_segment(mut segments: Vec<String>) -> Vec<String> {
    if segments.len() >= 2
        && segments
            .last()
            .is_some_and(|s| s.chars().next().is_some_and(|c| c.is_uppercase()))
    {
        segments.pop();
    }
    segments
}

fn super_module_base(importer: &str) -> Option<String> {
    if importer.ends_with("/mod.rs") {
        let scope = importer.strip_suffix("/mod.rs")?;
        Some(parent_dir(scope).to_string())
    } else {
        Some(parent_dir(importer).to_string())
    }
}

fn crate_root_dir(importer: &str) -> Option<String> {
    let mut dir = parent_dir(importer).to_string();
    loop {
        for root_file in ["lib.rs", "main.rs"] {
            let root_module = if dir.is_empty() {
                root_file.to_string()
            } else {
                format!("{dir}/{root_file}")
            };
            if importer == root_module {
                return Some(dir.clone());
            }
        }
        if importer.starts_with(&format!("{dir}/")) && is_crate_root_dir(&dir) {
            return Some(dir.clone());
        }
        if dir.is_empty() {
            break;
        }
        dir = parent_dir(&dir).to_string();
    }
    None
}

/// Cargo crate roots live at `src/lib.rs` / `src/main.rs` (or a top-level `lib.rs`).
/// `mod.rs`-only folders such as `language_adapter/` are nested modules, not crates.
fn is_crate_root_dir(dir: &str) -> bool {
    dir.is_empty() || dir.ends_with("/src") || dir == "src"
}

fn join_path(base: &str, segments: &[String]) -> String {
    if segments.is_empty() {
        return base.to_string();
    }
    format!("{}/{}", base, segments.join("/"))
}

fn relative_specifier(from_dir: &str, target_base: &str) -> String {
    let from_parts: Vec<&str> = if from_dir.is_empty() {
        Vec::new()
    } else {
        from_dir.split('/').collect()
    };
    let to_parts: Vec<&str> = if target_base.is_empty() {
        Vec::new()
    } else {
        target_base.split('/').collect()
    };
    let mut i = 0;
    while i < from_parts.len() && i < to_parts.len() && from_parts[i] == to_parts[i] {
        i += 1;
    }
    let ups = from_parts.len().saturating_sub(i);
    let mut rel: Vec<&str> = vec![".."; ups];
    rel.extend_from_slice(&to_parts[i..]);
    if rel.is_empty() {
        ".".to_string()
    } else {
        let joined = rel.join("/");
        if joined.starts_with("..") {
            joined
        } else {
            format!("./{joined}")
        }
    }
}

fn parent_dir(path: &str) -> &str {
    match path.rsplit_once('/') {
        Some((dir, _)) => dir,
        None => "",
    }
}
