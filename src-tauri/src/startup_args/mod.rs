// @Architecture(descriptionShort="Parse CLI argv for an optional startup project path")

use std::path::PathBuf;

/// Managed Tauri state holding the optional project path from argv.
pub struct StartupProjectPath(pub Option<String>);

/// Parse `argv` for a project folder: `--project <path>`, `--project=<path>`, or
/// the first non-flag positional. `--project` wins over a positional path.
pub fn parse_startup_project_path(args: &[String]) -> Option<String> {
    let rest = args.get(1..)?;
    flag_project_path(rest).or_else(|| positional_project_path(rest))
        .map(|path| normalize_project_path(&path))
}

fn flag_project_path(rest: &[String]) -> Option<String> {
    for (index, arg) in rest.iter().enumerate() {
        if arg == "--project" {
            return rest.get(index + 1).cloned();
        }
        if let Some(path) = arg.strip_prefix("--project=") {
            if path.is_empty() {
                return None;
            }
            return Some(path.to_string());
        }
    }
    None
}

fn positional_project_path(rest: &[String]) -> Option<String> {
    rest.iter()
        .find(|arg| !arg.starts_with('-'))
        .cloned()
}

fn normalize_project_path(path: &str) -> String {
    let path_buf = PathBuf::from(path);
    if !path_buf.is_dir() {
        return path.to_string();
    }
    path_buf
        .canonicalize()
        .map(|canonical| canonical.to_string_lossy().into_owned())
        .unwrap_or_else(|_| path.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;
    use tempfile::tempdir;

    fn argv(parts: &[&str]) -> Vec<String> {
        let mut args = vec!["codechart".to_string()];
        args.extend(parts.iter().map(|part| (*part).to_string()));
        args
    }

    #[test]
    fn no_args_returns_none() {
        assert_eq!(parse_startup_project_path(&argv(&[])), None);
    }

    #[test]
    fn positional_path_is_used() {
        assert_eq!(
            parse_startup_project_path(&argv(&["/some/project"])),
            Some("/some/project".to_string())
        );
    }

    #[test]
    fn project_flag_with_space_is_used() {
        assert_eq!(
            parse_startup_project_path(&argv(&["--project", "/flagged/project"])),
            Some("/flagged/project".to_string())
        );
    }

    #[test]
    fn project_flag_with_equals_is_used() {
        assert_eq!(
            parse_startup_project_path(&argv(&["--project=/equals/project"])),
            Some("/equals/project".to_string())
        );
    }

    #[test]
    fn project_flag_overrides_positional() {
        assert_eq!(
            parse_startup_project_path(&argv(&["/positional", "--project", "/flagged"])),
            Some("/flagged".to_string())
        );
    }

    #[test]
    fn flags_only_returns_none() {
        assert_eq!(parse_startup_project_path(&argv(&["--project"])), None);
    }

    #[test]
    fn existing_directory_is_canonicalized() {
        let dir = tempdir().expect("tempdir");
        let expected = dir.path().canonicalize().expect("canonicalize");
        let path = dir.path().to_string_lossy().to_string();
        assert_eq!(
            parse_startup_project_path(&argv(&[path.as_str()])),
            Some(expected.to_string_lossy().into_owned())
        );
    }

    #[test]
    fn nonexistent_path_is_returned_raw() {
        let missing = "/definitely/not/a/real/codechart/project/path";
        assert!(!Path::new(missing).exists());
        assert_eq!(
            parse_startup_project_path(&argv(&[missing])),
            Some(missing.to_string())
        );
    }
}
