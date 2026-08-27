// @Architecture(descriptionShort="Project-local Unreal include path configuration")
// unreal_config — read/write CodeChart's project-local config and derive Unreal
// C++ defaults from the project shape. The analysis pipeline consumes the pure
// options; only Tauri filesystem entry points persist missing defaults.

use serde::{Deserialize, Serialize};
use std::collections::BTreeSet;
use std::path::{Path, PathBuf};

use crate::project_source::ProjectSource;

mod detect;

pub const CONFIG_PATH: &str = ".codechart/config.json";
pub const DEFAULT_EDITOR: &str = "code";

pub use detect::{analysis_fs_source, is_unreal_project, should_skip_plugins_walk};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectConfig {
    #[serde(default = "default_editor")]
    pub editor: String,
    pub unreal: UnrealConfig,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UnrealConfig {
    pub known_paths: Vec<String>,
    pub hide_generated_files: bool,
    pub exclude_engine_references: bool,
    #[serde(default = "default_true")]
    pub hide_plugins: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UnrealOptions {
    pub known_paths: Vec<String>,
    pub hide_generated_files: bool,
    pub exclude_engine_references: bool,
    pub hide_plugins: bool,
}

impl Default for ProjectConfig {
    fn default() -> Self {
        Self {
            editor: default_editor(),
            unreal: UnrealConfig::default(),
        }
    }
}

impl Default for UnrealConfig {
    fn default() -> Self {
        Self {
            known_paths: Vec::new(),
            hide_generated_files: true,
            exclude_engine_references: true,
            hide_plugins: true,
        }
    }
}

impl ProjectConfig {
    pub fn unreal_options(&self) -> UnrealOptions {
        UnrealOptions {
            known_paths: normalized_paths(&self.unreal.known_paths),
            hide_generated_files: self.unreal.hide_generated_files,
            exclude_engine_references: self.unreal.exclude_engine_references,
            hide_plugins: self.unreal.hide_plugins,
        }
    }
}

impl Default for UnrealOptions {
    fn default() -> Self {
        Self {
            known_paths: Vec::new(),
            hide_generated_files: false,
            exclude_engine_references: false,
            hide_plugins: false,
        }
    }
}

pub fn config_from_source(source: &dyn ProjectSource) -> ProjectConfig {
    match source.read_file(CONFIG_PATH) {
        Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
        Err(_) => deduced_config(source).unwrap_or_default(),
    }
}

pub fn unreal_options_from_source(source: &dyn ProjectSource) -> UnrealOptions {
    match source.read_file(CONFIG_PATH) {
        Ok(content) => serde_json::from_str::<ProjectConfig>(&content)
            .unwrap_or_default()
            .unreal_options(),
        Err(_) => deduced_config(source)
            .map(|config| config.unreal_options())
            .unwrap_or_default(),
    }
}

pub fn read_project_config(root: &str) -> Result<ProjectConfig, String> {
    let path = Path::new(root).join(CONFIG_PATH);
    if !path.exists() {
        return Ok(ProjectConfig::default());
    }
    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

pub fn write_project_config(root: &str, config: ProjectConfig) -> Result<(), String> {
    let path = Path::new(root).join(CONFIG_PATH);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let content = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    std::fs::write(path, format!("{content}\n")).map_err(|e| e.to_string())
}

pub fn ensure_unreal_defaults(root: &str) -> Result<(), String> {
    let path = Path::new(root).join(CONFIG_PATH);
    let source = crate::project_source::FsProjectSource::new(root);
    let Some(deduced) = deduced_config(&source) else {
        return Ok(());
    };
    if deduced.unreal.known_paths.is_empty() {
        return Ok(());
    }
    if !path.exists() {
        return write_project_config(root, deduced);
    }
    let mut config = read_project_config(root)?;
    if !config.unreal.known_paths.is_empty() {
        return Ok(());
    }
    config.unreal.known_paths = deduced.unreal.known_paths;
    write_project_config(root, config)
}

fn deduced_config(source: &dyn ProjectSource) -> Option<ProjectConfig> {
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

fn normalized_paths(paths: &[String]) -> Vec<String> {
    paths
        .iter()
        .map(|p| p.trim().replace('\\', "/").trim_matches('/').to_string())
        .filter(|p| !p.is_empty())
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect()
}

fn default_editor() -> String {
    DEFAULT_EDITOR.to_string()
}

fn default_true() -> bool {
    true
}

#[cfg(test)]
mod tests;
