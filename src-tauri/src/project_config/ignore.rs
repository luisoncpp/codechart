// Ignore globs for project-wide file filtering (TDD §7 built-in defaults + root
// `*.group.md` `ignore` entries). Private to `project_config`.

use glob::Pattern;

use super::GroupDef;

const DEFAULT_IGNORE: &[&str] = &[
    ".git/**",
    "node_modules/**",
    "dist/**",
    "build/**",
    ".next/**",
    "coverage/**",
];

/// Built-in ignore globs merged with root-placed group `ignore` fields.
pub fn ignore_patterns(defs: &[GroupDef]) -> Vec<Pattern> {
    let mut globs: Vec<String> = DEFAULT_IGNORE.iter().map(|s| (*s).to_string()).collect();
    for def in defs {
        if def.dir.is_empty() {
            globs.extend(def.ignore.iter().cloned());
        }
    }
    globs.iter().filter_map(|g| Pattern::new(g).ok()).collect()
}

pub fn is_ignored(path: &str, patterns: &[Pattern]) -> bool {
    patterns.iter().any(|p| p.matches(path))
}

pub fn retain_unignored(paths: Vec<String>, patterns: &[Pattern]) -> Vec<String> {
    paths
        .into_iter()
        .filter(|p| !is_ignored(p, patterns))
        .collect()
}
