use crate::analysis::analyze_project as run_analysis;
use crate::contract::ProjectGraph;
use crate::project_source::FsProjectSource;

/// Analyze the project rooted at `path` (a user-chosen folder) and return the
/// `ProjectGraph`. The path is used both as the filesystem root and as the
/// graph's recorded `root`. Build failures surface as a string error so the
/// frontend's `failed` session phase can show them.
#[tauri::command]
pub fn analyze_project(path: String) -> Result<ProjectGraph, String> {
    let source = FsProjectSource::new(&path);
    run_analysis(&source, &path).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests;
