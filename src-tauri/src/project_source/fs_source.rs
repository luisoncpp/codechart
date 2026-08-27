// @Architecture(descriptionShort="Filesystem ProjectSource walking the project directory tree")

use std::path::{Path, PathBuf};

use super::{ProjectSource, ProjectSourceError};

/// Directory names skipped during a walk (the §7 ignore defaults, dir form).
const IGNORED_DIRS: &[&str] = &[
    ".git",
    "node_modules",
    "dist",
    "build",
    ".next",
    "coverage",
    "Intermediate",
    "Binaries",
    "Saved",
    "DerivedDataCache",
];

pub struct FsProjectSource {
    root: PathBuf,
    skip_plugins: bool,
}

impl FsProjectSource {
    pub fn new(root: impl Into<PathBuf>) -> Self {
        Self {
            root: root.into(),
            skip_plugins: false,
        }
    }

    /// Same walk as [`Self::new`], but directories named `Plugins` are not entered.
    pub fn skipping_plugins(root: impl Into<PathBuf>) -> Self {
        Self {
            root: root.into(),
            skip_plugins: true,
        }
    }
}

impl ProjectSource for FsProjectSource {
    fn list_files(&self) -> Result<Vec<String>, ProjectSourceError> {
        let mut out = Vec::new();
        walk(self, &self.root, &mut out)?;
        out.sort();
        Ok(out)
    }

    fn read_file(&self, path: &str) -> Result<String, ProjectSourceError> {
        let full = self.root.join(path);
        std::fs::read_to_string(&full).map_err(ProjectSourceError::Io)
    }
}

/// Recursively collect repo-relative POSIX file paths under `dir`.
fn walk(
    source: &FsProjectSource,
    dir: &Path,
    out: &mut Vec<String>,
) -> Result<(), ProjectSourceError> {
    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        if entry.file_type()?.is_dir() {
            if !skip_dir(source, &entry.file_name().to_string_lossy()) {
                walk(source, &entry.path(), out)?;
            }
            continue;
        }
        if let Some(rel) = relative_posix(&source.root, &entry.path()) {
            out.push(rel);
        }
    }
    Ok(())
}

fn skip_dir(source: &FsProjectSource, name: &str) -> bool {
    if IGNORED_DIRS.contains(&name) {
        return true;
    }
    source.skip_plugins && name == "Plugins"
}

fn relative_posix(root: &Path, path: &Path) -> Option<String> {
    let rel = path.strip_prefix(root).ok()?;
    Some(rel.to_string_lossy().replace('\\', "/"))
}

#[cfg(test)]
mod tests {
    use super::FsProjectSource;
    use crate::project_source::ProjectSource;

    #[test]
    fn skipping_plugins_does_not_list_plugin_sources() {
        let temp = tempfile::tempdir().expect("tempdir");
        let root = temp.path();
        std::fs::create_dir_all(root.join("Plugins/Inventory")).expect("plugins dir");
        std::fs::create_dir_all(root.join("Source/Game")).expect("source dir");
        std::fs::write(root.join("Game.uproject"), "{}").expect("uproject");
        std::fs::write(root.join("Source/Game/Game.cpp"), "").expect("game cpp");
        std::fs::write(root.join("Plugins/Inventory/Inv.cpp"), "").expect("plugin cpp");
        let listed = FsProjectSource::skipping_plugins(root)
            .list_files()
            .expect("list");
        assert!(listed.iter().any(|p| p.ends_with("Game.cpp")));
        assert!(listed.iter().all(|p| !p.contains("Plugins")));
    }

    #[test]
    fn new_still_lists_plugin_sources() {
        let temp = tempfile::tempdir().expect("tempdir");
        let root = temp.path();
        std::fs::create_dir_all(root.join("Plugins/Inventory")).expect("plugins dir");
        std::fs::write(root.join("Plugins/Inventory/Inv.cpp"), "").expect("plugin cpp");
        let listed = FsProjectSource::new(root).list_files().expect("list");
        assert!(listed.iter().any(|p| p.contains("Plugins")));
    }
}
