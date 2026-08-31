// @Architecture(descriptionShort="Deduces Unreal include paths from the project file list")
// Only reached when `.codechart/config.json` is absent: derive `knownPaths` from
// the project shape so an Unreal project resolves includes on first open. Returns
// `None` for non-Unreal projects, which is what keeps Unreal filters off elsewhere.

use std::collections::BTreeSet;
use std::path::PathBuf;

use super::{is_unreal_project, ProjectConfig, UnrealConfig};
use crate::project_source::ProjectSource;

pub fn deduced_config(source: &dyn ProjectSource) -> Option<ProjectConfig> {
    let files = source.list_files().ok()?;
    if !is_unreal_project(&files) {
        return None;
    }
    let paths = deduce_known_paths(&files);
    Some(ProjectConfig {
        unreal: UnrealConfig {
            known_paths: paths,
            ..UnrealConfig::default()
        },
        ..ProjectConfig::default()
    })
}

fn deduce_known_paths(files: &[String]) -> Vec<String> {
    let mut paths = BTreeSet::new();
    if files.iter().any(|p| p.starts_with("Source/")) {
        paths.insert("Source".to_string());
    }
    for file in files.iter().filter(|p| p.ends_with(".Build.cs")) {
        add_module_paths(file, &mut paths);
    }
    paths.into_iter().collect()
}

fn add_module_paths(file: &str, paths: &mut BTreeSet<String>) {
    let Some(dir) = parent_dir(file) else {
        return;
    };
    paths.insert(dir.clone());
    for child in ["Public", "Private", "Classes"] {
        paths.insert(format!("{dir}/{child}"));
    }
}

fn parent_dir(path: &str) -> Option<String> {
    let path = PathBuf::from(path.replace('\\', "/"));
    let parent = path.parent()?;
    let text = parent.to_string_lossy().replace('\\', "/");
    if text.is_empty() || text == "." {
        None
    } else {
        Some(text)
    }
}
