use std::path::{Path, PathBuf};

use super::{ProjectSource, ProjectSourceError};

/// Directory names skipped during a walk (the §7 ignore defaults, dir form).
const IGNORED_DIRS: &[&str] = &[".git", "node_modules", "dist", "build", ".next", "coverage"];

pub struct FsProjectSource {
    root: PathBuf,
}

impl FsProjectSource {
    pub fn new(root: impl Into<PathBuf>) -> Self {
        Self { root: root.into() }
    }
}

impl ProjectSource for FsProjectSource {
    fn list_files(&self) -> Result<Vec<String>, ProjectSourceError> {
        let mut out = Vec::new();
        walk(&self.root, &self.root, &mut out)?;
        out.sort();
        Ok(out)
    }

    fn read_file(&self, path: &str) -> Result<String, ProjectSourceError> {
        let full = self.root.join(path);
        std::fs::read_to_string(&full).map_err(ProjectSourceError::Io)
    }
}

/// Recursively collect repo-relative POSIX file paths under `dir`, skipping the
/// ignore-default directories.
fn walk(root: &Path, dir: &Path, out: &mut Vec<String>) -> Result<(), ProjectSourceError> {
    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        if entry.file_type()?.is_dir() {
            if !IGNORED_DIRS.contains(&entry.file_name().to_string_lossy().as_ref()) {
                walk(root, &entry.path(), out)?;
            }
            continue;
        }
        if let Some(rel) = relative_posix(root, &entry.path()) {
            out.push(rel);
        }
    }
    Ok(())
}

fn relative_posix(root: &Path, path: &Path) -> Option<String> {
    let rel = path.strip_prefix(root).ok()?;
    Some(rel.to_string_lossy().replace('\\', "/"))
}
