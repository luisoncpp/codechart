// @Architecture(descriptionShort="Expands project-config ignoredPaths directories into ignore globs")
// The project-scoped `ignoredPaths` list from `.codechart/config.json`. Entries are
// repo-relative *directory paths*, not globs — `Source/ThirdParty` ignores that
// subtree and never matches `Other/ThirdParty`. The same normalized entries drive
// the filesystem walk skip (`FsProjectSource`), so both layers agree.

use glob::Pattern;

use super::retain_unignored;

/// A configured directory path ignores the directory itself and everything under it.
pub fn ignored_path_globs(paths: &[String]) -> Vec<String> {
    let mut globs = Vec::new();
    for raw in paths {
        let path = normalize_ignored_path(raw);
        if path.is_empty() {
            continue;
        }
        globs.push(format!("{path}/**"));
        globs.push(path);
    }
    globs
}

/// Trim, POSIX-ify, and strip surrounding slashes from one configured entry.
pub fn normalize_ignored_path(path: &str) -> String {
    path.trim().replace('\\', "/").trim_matches('/').to_string()
}

/// Drop every path inside a configured ignored directory. Runs before group
/// discovery so a `*.group.md` under an ignored directory declares nothing.
pub fn retain_without_ignored_paths(paths: Vec<String>, ignored: &[String]) -> Vec<String> {
    if ignored.is_empty() {
        return paths;
    }
    let patterns: Vec<Pattern> = ignored_path_globs(ignored)
        .iter()
        .filter_map(|g| Pattern::new(g).ok())
        .collect();
    retain_unignored(paths, &patterns)
}

#[cfg(test)]
mod tests {
    use super::{ignored_path_globs, retain_without_ignored_paths};

    #[test]
    fn expands_a_directory_path_to_itself_plus_subtree() {
        let globs = ignored_path_globs(&["vendor".to_string()]);
        assert_eq!(globs, vec!["vendor/**".to_string(), "vendor".to_string()]);
    }

    #[test]
    fn normalizes_backslashes_trailing_slashes_and_blanks() {
        let globs = ignored_path_globs(&[
            "  Source\\ThirdParty/ ".to_string(),
            String::new(),
            "   ".to_string(),
        ]);
        assert_eq!(
            globs,
            vec![
                "Source/ThirdParty/**".to_string(),
                "Source/ThirdParty".to_string(),
            ]
        );
    }

    #[test]
    fn a_path_entry_does_not_match_a_same_named_sibling_subtree() {
        let kept = retain_without_ignored_paths(
            vec![
                "Source/ThirdParty/a.cpp".into(),
                "Other/ThirdParty/b.cpp".into(),
                "Source/Game/c.cpp".into(),
            ],
            &["Source/ThirdParty".to_string()],
        );
        assert_eq!(
            kept,
            vec![
                "Other/ThirdParty/b.cpp".to_string(),
                "Source/Game/c.cpp".to_string(),
            ]
        );
    }

    #[test]
    fn drops_group_files_and_nested_paths_under_an_ignored_directory() {
        let kept = retain_without_ignored_paths(
            vec![
                "vendor/vendor.group.md".into(),
                "vendor/deep/nested/x.ts".into(),
                "vendored/x.ts".into(),
            ],
            &["vendor".to_string()],
        );
        assert_eq!(kept, vec!["vendored/x.ts".to_string()]);
    }

    #[test]
    fn an_empty_list_is_a_no_op() {
        let kept = retain_without_ignored_paths(vec!["src/a.ts".into()], &[]);
        assert_eq!(kept, vec!["src/a.ts".to_string()]);
    }
}
