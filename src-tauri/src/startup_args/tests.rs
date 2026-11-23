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

#[test]
fn resolve_falls_back_to_env_when_cli_absent() {
    let dir = tempdir().expect("tempdir");
    let expected = dir.path().canonicalize().expect("canonicalize");
    let path = format!("  {}  ", dir.path().to_string_lossy());
    assert_eq!(
        resolve_startup_project_path(&argv(&[]), Some(&path)),
        Some(expected.to_string_lossy().into_owned())
    );
}

#[test]
fn resolve_prefers_cli_over_env_and_ignores_blank_env() {
    assert_eq!(
        resolve_startup_project_path(&argv(&["--project", "/cli/path"]), Some("/env/path")),
        Some("/cli/path".to_string())
    );
    assert_eq!(resolve_startup_project_path(&argv(&[]), Some("   ")), None);
}

#[test]
fn parse_window_size_validates_format_and_bounds() {
    assert_eq!(parse_window_size("1440x900"), Some((1440.0, 900.0)));
    assert_eq!(parse_window_size(" 1280X720 "), Some((1280.0, 720.0)));
    assert_eq!(parse_window_size("200x600"), None);
    assert_eq!(parse_window_size("1280x100"), None);
    assert_eq!(parse_window_size("9000x900"), None);
    assert_eq!(parse_window_size("NaNx800"), None);
    assert_eq!(parse_window_size("1280"), None);
}
