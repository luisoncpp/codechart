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
    /// Repo-relative POSIX directory paths never entered. Unlike `skip_plugins`
    /// (a directory *name*, matched at any depth), these are exact paths, so
    /// `Source/ThirdParty` leaves `Other/ThirdParty` alone.
    ignored_dirs: Vec<String>,
}

impl FsProjectSource {
    pub fn new(root: impl Into<PathBuf>) -> Self {
        Self {
            root: root.into(),
            skip_plugins: false,
            ignored_dirs: Vec::new(),
        }
    }

    /// Same walk as [`Self::new`], but directories named `Plugins` are not entered.
    pub fn skipping_plugins(root: impl Into<PathBuf>) -> Self {
        Self {
            skip_plugins: true,
            ..Self::new(root)
        }
    }

    /// Never enter these repo-relative directories (project config `ignoredPaths`).
    /// A pure walk optimization — the glob ignore set stays the source of truth.
    pub fn with_ignored_dirs(self, ignored_dirs: Vec<String>) -> Self {
        Self {
            ignored_dirs,
            ..self
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
        let path = entry.path();
        if entry.file_type()?.is_dir() {
            if !skip_dir(source, &path) {
                walk(source, &path, out)?;
            }
            continue;
        }
        if let Some(rel) = relative_posix(&source.root, &path) {
            out.push(rel);
        }
    }
    Ok(())
}

/// `dir` is the absolute directory path so configured `ignored_dirs` can be
/// matched as repo-relative paths rather than bare names.
fn skip_dir(source: &FsProjectSource, dir: &Path) -> bool {
    let name = dir
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();
    if IGNORED_DIRS.contains(&name.as_str()) {
        return true;
    }
    if source.skip_plugins && name == "Plugins" {
        return true;
    }
    relative_posix(&source.root, dir)
        .map(|rel| source.ignored_dirs.contains(&rel))
        .unwrap_or(/*outside the root=*/ false)
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
    fn ignored_dirs_are_never_entered_but_same_named_siblings_are() {
        let temp = tempfile::tempdir().expect("tempdir");
        let root = temp.path();
        std::fs::create_dir_all(root.join("src/vendor")).expect("src vendor");
        std::fs::create_dir_all(root.join("tools/vendor")).expect("tools vendor");
        std::fs::write(root.join("src/vendor/a.ts"), "").expect("a");
        std::fs::write(root.join("tools/vendor/b.ts"), "").expect("b");
        let listed = FsProjectSource::new(root)
            .with_ignored_dirs(vec!["src/vendor".to_string()])
            .list_files()
            .expect("list");
        assert_eq!(listed, vec!["tools/vendor/b.ts".to_string()]);
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
