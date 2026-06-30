// @Architecture(descriptionShort="Merges built-in and config ignore globs for file discovery")

use glob::Pattern;

use super::GroupDef;
use crate::unreal_config::UnrealOptions;

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

pub fn ignore_patterns_with_unreal(
    defs: &[GroupDef],
    unreal: &UnrealOptions,
) -> Vec<Pattern> {
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
