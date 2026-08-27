// @Architecture(descriptionShort="Merges built-in and config ignore globs for file discovery")

use glob::Pattern;

use super::GroupDef;
use crate::UnrealOptions;

const DEFAULT_IGNORE: &[&str] = &[
    ".git/**",
    "node_modules/**",
    "dist/**",
    "build/**",
    ".next/**",
    "coverage/**",
    "Library/**",
    "Temp/**",
    "Logs/**",
];

/// Built-in ignore globs merged with root-placed group `ignore` fields.
pub fn ignore_patterns(defs: &[GroupDef]) -> Vec<Pattern> {
    ignore_patterns_with_unreal(defs, &UnrealOptions::default())
}

pub fn ignore_patterns_with_unreal(defs: &[GroupDef], unreal: &UnrealOptions) -> Vec<Pattern> {
    let mut globs: Vec<String> = DEFAULT_IGNORE.iter().map(|s| (*s).to_string()).collect();
    if unreal.hide_generated_files {
        globs.extend(unreal_generated_globs());
    }
    for def in defs {
        if def.dir.is_empty() {
            globs.extend(def.ignore.iter().cloned());
        }
    }
    globs.iter().filter_map(|g| Pattern::new(g).ok()).collect()
}

fn unreal_generated_globs() -> Vec<String> {
    [
        "**/*.generated.h",
        "**/*.gen.cpp",
        "Intermediate/**",
        "Binaries/**",
        "Saved/**",
        "DerivedDataCache/**",
    ]
    .iter()
    .map(|s| (*s).to_string())
    .collect()
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

/// True when the path sits under a **top-level** directory whose name starts with `.`
/// (e.g. `.agents/foo.ts`). Top-level dotfiles (`.eslintrc.js`) and nested
/// `src/.hidden/…` paths are not matched.
pub fn is_under_top_level_dot_dir(path: &str) -> bool {
    path.split_once('/')
        .map(|(first, _)| first.starts_with('.'))
        .unwrap_or(/*top-level file=*/false)
}

pub fn retain_without_top_level_dot_dirs(paths: Vec<String>) -> Vec<String> {
    paths
        .into_iter()
        .filter(|p| !is_under_top_level_dot_dir(p))
        .collect()
}

/// True when any path segment is the Unreal `Plugins` directory.
pub fn is_under_plugins_dir(path: &str) -> bool {
    path.split('/').any(|seg| seg == "Plugins")
}

pub fn retain_without_plugins_dirs(paths: Vec<String>) -> Vec<String> {
    paths
        .into_iter()
        .filter(|p| !is_under_plugins_dir(p))
        .collect()
}

#[cfg(test)]
mod top_level_dot_dir_tests {
    use super::{is_under_top_level_dot_dir, retain_without_top_level_dot_dirs};

    #[test]
    fn matches_only_top_level_dot_directories() {
        assert!(is_under_top_level_dot_dir(".agents/skills/x.js"));
        assert!(is_under_top_level_dot_dir(".claude/foo.ts"));
        assert!(!is_under_top_level_dot_dir(".eslintrc.js"));
        assert!(!is_under_top_level_dot_dir("src/.hidden/x.ts"));
        assert!(!is_under_top_level_dot_dir("src/core/store.ts"));
    }

    #[test]
    fn retain_drops_dot_dir_paths() {
        let kept = retain_without_top_level_dot_dirs(vec![
            ".agents/a.ts".into(),
            "src/a.ts".into(),
            ".env".into(),
        ]);
        assert_eq!(kept, vec!["src/a.ts".to_string(), ".env".to_string()]);
    }
}

#[cfg(test)]
mod plugins_dir_tests {
    use super::{is_under_plugins_dir, retain_without_plugins_dirs};

    #[test]
    fn matches_any_plugins_directory_segment() {
        assert!(is_under_plugins_dir("Plugins/Inventory/Inv.cpp"));
        assert!(is_under_plugins_dir("Engine/Plugins/Foo/Bar.h"));
        assert!(!is_under_plugins_dir("Source/Plugins.h"));
        assert!(!is_under_plugins_dir("Source/Game/Game.cpp"));
    }

    #[test]
    fn retain_drops_plugin_paths() {
        let kept = retain_without_plugins_dirs(vec![
            "Source/Game/Game.cpp".into(),
            "Plugins/Inventory/Inv.cpp".into(),
            "Engine/Plugins/Foo.h".into(),
        ]);
        assert_eq!(kept, vec!["Source/Game/Game.cpp".to_string()]);
    }
}
