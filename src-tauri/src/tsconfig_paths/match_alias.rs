// @Architecture(descriptionShort="Maps @ path-alias specifiers to repo-relative paths")

use super::PathAliases;

/// Map a non-relative import specifier through tsconfig `paths`, or `None`.
pub fn mapped_path(aliases: &PathAliases, specifier: &str) -> Option<String> {
    if aliases.mappings.is_empty() {
        return None;
    }
    for (pattern, target) in &aliases.mappings {
        if let Some(mapped) = replace_pattern(specifier, pattern, target) {
            return Some(join_alias_base(aliases, &mapped));
        }
    }
    None
}

fn replace_pattern(specifier: &str, pattern: &str, target: &str) -> Option<String> {
    let star = pattern.find('*')?;
    let prefix = &pattern[..star];
    let suffix = &pattern[star + 1..];
    if !specifier.starts_with(prefix) || !specifier.ends_with(suffix) {
        return None;
    }
    let matched = &specifier[prefix.len()..specifier.len() - suffix.len()];
    let target_star = target.find('*')?;
    Some(format!(
        "{}{}{}",
        &target[..target_star],
        matched,
        &target[target_star + 1..]
    ))
}

fn join_alias_base(aliases: &PathAliases, mapped: &str) -> String {
    let base = join_segments(&aliases.config_dir, &aliases.base_url);
    normalize_path(&join_segments(&base, mapped))
}

fn join_segments(left: &str, right: &str) -> String {
    if left.is_empty() {
        return normalize_path(right);
    }
    if right.is_empty() {
        return normalize_path(left);
    }
    normalize_path(&format!("{left}/{right}"))
}

fn normalize_path(path: &str) -> String {
    let mut parts: Vec<&str> = Vec::new();
    for seg in path.split('/') {
        match seg {
            "" | "." => {}
            ".." => {
                parts.pop();
            }
            other => parts.push(other),
        }
    }
    parts.join("/")
}
