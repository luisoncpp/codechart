// @Architecture(descriptionShort="Detects Unreal projects and whether Plugins should be skipped")
use std::path::Path;

use super::read_project_config;

/// True when the listed files look like an Unreal project or plugin.
pub fn is_unreal_project(files: &[String]) -> bool {
    files
        .iter()
        .any(|p| p.ends_with(".uproject") || p.ends_with(".uplugin") || p.ends_with(".Build.cs"))
}

/// Walk-time skip for `Plugins/` — Unreal root plus the persisted toggle (default on).
pub fn should_skip_plugins_walk(root: &str) -> bool {
    if !looks_like_unreal_root(Path::new(root)) {
        return false;
    }
    read_project_config(root)
        .map(|config| config.unreal.hide_plugins)
        .unwrap_or(/*unreal default=*/ true)
}

/// Filesystem source for analysis: skips `Plugins/` when [`should_skip_plugins_walk`].
pub fn analysis_fs_source(root: &str) -> crate::project_source::FsProjectSource {
    if should_skip_plugins_walk(root) {
        crate::project_source::FsProjectSource::skipping_plugins(root)
    } else {
        crate::project_source::FsProjectSource::new(root)
    }
}

fn looks_like_unreal_root(root: &Path) -> bool {
    let Ok(entries) = std::fs::read_dir(root) else {
        return false;
    };
    entries.filter_map(|e| e.ok()).any(|entry| {
        let name = entry.file_name();
        let text = name.to_string_lossy();
        text.ends_with(".uproject") || text.ends_with(".uplugin")
    })
}
