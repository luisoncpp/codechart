// @Architecture(descriptionShort="Parse CLI argv for an optional startup project path")

use std::path::PathBuf;

/// Managed Tauri state holding the optional project path from argv.
pub struct StartupProjectPath(pub Option<String>);

const MIN_WINDOW_WIDTH: f64 = 320.0;
const MAX_WINDOW_WIDTH: f64 = 7680.0;
const MIN_WINDOW_HEIGHT: f64 = 240.0;
const MAX_WINDOW_HEIGHT: f64 = 4320.0;

/// Resolve startup project path from CLI argv first, then an optional env fallback.
pub fn resolve_startup_project_path(args: &[String], env_project: Option<&str>) -> Option<String> {
    parse_startup_project_path(args).or_else(|| {
        env_project
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(normalize_project_path)
    })
}

/// Parse `<width>x<height>` (case-insensitive `x`) into validated logical pixels.
pub fn parse_window_size(raw: &str) -> Option<(f64, f64)> {
    let normalized = raw.trim();
    let (w, h) = normalized
        .split_once('x')
        .or_else(|| normalized.split_once('X'))?;
    let width = w.trim().parse::<f64>().ok()?;
    let height = h.trim().parse::<f64>().ok()?;
    if !is_valid_window_size(width, height) {
        return None;
    }
    Some((width, height))
}

fn is_valid_window_size(width: f64, height: f64) -> bool {
    width.is_finite()
        && height.is_finite()
        && (MIN_WINDOW_WIDTH..=MAX_WINDOW_WIDTH).contains(&width)
        && (MIN_WINDOW_HEIGHT..=MAX_WINDOW_HEIGHT).contains(&height)
}

/// Parse `argv` for a project folder: `--project <path>`, `--project=<path>`, or
/// the first non-flag positional. `--project` wins over a positional path.
pub fn parse_startup_project_path(args: &[String]) -> Option<String> {
    let rest = args.get(1..)?;
    flag_project_path(rest)
        .or_else(|| positional_project_path(rest))
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
    rest.iter().find(|arg| !arg.starts_with('-')).cloned()
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
mod tests;
