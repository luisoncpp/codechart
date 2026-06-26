// @Architecture(descriptionShort="Detects repo-relative paths that look like test modules")

const TEST_SUFFIXES: &[&str] = &[
    ".test.ts",
    ".test.tsx",
    ".test.js",
    ".test.jsx",
    ".test.mjs",
    ".test.cjs",
    ".spec.ts",
    ".spec.tsx",
    ".spec.js",
    ".spec.jsx",
    ".spec.mjs",
    ".spec.cjs",
];

/// True when a repo-relative module path looks like a test file.
/// Mirrors `src/domain/graph/Private/test-modules.ts`.
pub fn is_test_module(path: &str) -> bool {
    if test_file_suffix(path) {
        return true;
    }
    path.split('/')
        .any(|seg| matches!(seg, "__tests__" | "tests" | "test"))
}

fn test_file_suffix(path: &str) -> bool {
    TEST_SUFFIXES
        .iter()
        .any(|suffix| ends_with_ignore_ascii_case(path, suffix))
}

fn ends_with_ignore_ascii_case(haystack: &str, suffix: &str) -> bool {
    haystack.len() >= suffix.len()
        && haystack.as_bytes()[haystack.len() - suffix.len()..]
            .eq_ignore_ascii_case(suffix.as_bytes())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn matches_common_test_file_suffixes() {
        assert!(is_test_module("src/foo.test.ts"));
        assert!(is_test_module("src/foo.spec.tsx"));
        assert!(is_test_module("src/Foo.Test.ts"));
    }

    #[test]
    fn matches_test_directory_segments() {
        assert!(is_test_module("tests/integration.test.ts"));
        assert!(is_test_module("src/__tests__/util.ts"));
        assert!(is_test_module("src/test/helpers.ts"));
    }

    #[test]
    fn ignores_production_paths() {
        assert!(!is_test_module("src/app.ts"));
        assert!(!is_test_module("src/contest/winner.ts"));
        assert!(!is_test_module("src/testing-utils.ts"));
    }
}
