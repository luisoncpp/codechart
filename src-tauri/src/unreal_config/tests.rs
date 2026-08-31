use std::collections::HashMap;

use super::*;
use crate::project_source::MemoryProjectSource;

fn memory(files: &[(&str, &str)]) -> MemoryProjectSource {
    let map: HashMap<String, String> = files
        .iter()
        .map(|(p, c)| ((*p).to_string(), (*c).to_string()))
        .collect();
    MemoryProjectSource::new(map)
}

#[test]
fn deduces_unreal_module_include_paths() {
    let source = memory(&[
        ("Shooter.uproject", "{}"),
        ("Source/Shooter/Shooter.Build.cs", ""),
        ("Plugins/Inventory/Source/Inventory/Inventory.Build.cs", ""),
    ]);
    let config = config_from_source(&source);
    assert_eq!(
        config.unreal.known_paths,
        vec![
            "Plugins/Inventory/Source/Inventory".to_string(),
            "Plugins/Inventory/Source/Inventory/Classes".to_string(),
            "Plugins/Inventory/Source/Inventory/Private".to_string(),
            "Plugins/Inventory/Source/Inventory/Public".to_string(),
            "Source".to_string(),
            "Source/Shooter".to_string(),
            "Source/Shooter/Classes".to_string(),
            "Source/Shooter/Private".to_string(),
            "Source/Shooter/Public".to_string(),
        ]
    );
    assert!(config.unreal.hide_generated_files);
    assert!(config.unreal.exclude_engine_references);
    assert!(config.unreal.hide_plugins);
}

#[test]
fn explicit_config_wins_over_deduced_defaults() {
    let source = memory(&[
        ("Shooter.uproject", "{}"),
        ("Source/Shooter/Shooter.Build.cs", ""),
        (
            CONFIG_PATH,
            r#"{"unreal":{"knownPaths":["Custom"],"hideGeneratedFiles":false,"excludeEngineReferences":false}}"#,
        ),
    ]);
    let config = config_from_source(&source);
    assert_eq!(config.unreal.known_paths, vec!["Custom".to_string()]);
    assert!(!config.unreal.hide_generated_files);
    assert!(!config.unreal.exclude_engine_references);
    assert!(config.unreal.hide_plugins, "missing field defaults on");
}

#[test]
fn explicit_hide_plugins_false_wins() {
    let source = memory(&[(
        CONFIG_PATH,
        r#"{"unreal":{"knownPaths":[],"hideGeneratedFiles":true,"excludeEngineReferences":true,"hidePlugins":false}}"#,
    )]);
    assert!(!config_from_source(&source).unreal.hide_plugins);
}

#[test]
fn config_without_editor_uses_vscode_default() {
    let source = memory(&[(
        CONFIG_PATH,
        r#"{"unreal":{"knownPaths":[],"hideGeneratedFiles":true,"excludeEngineReferences":true}}"#,
    )]);
    assert_eq!(config_from_source(&source).editor, DEFAULT_EDITOR);
}

#[test]
fn read_write_project_config_round_trips() {
    let temp = tempfile::tempdir().expect("tempdir");
    let root = temp.path().to_string_lossy().to_string();
    let config = ProjectConfig {
        editor: "code-insiders".into(),
        ignored_paths: vec!["vendor".into()],
        unreal: UnrealConfig {
            known_paths: vec!["Source/Game/Public".into()],
            hide_generated_files: false,
            exclude_engine_references: true,
            hide_plugins: false,
        },
    };
    write_project_config(&root, config.clone()).expect("write config");
    assert_eq!(read_project_config(&root).expect("read config"), config);
}

#[test]
fn ensure_defaults_fills_empty_existing_config() {
    let temp = tempfile::tempdir().expect("tempdir");
    let root_path = temp.path();
    std::fs::create_dir_all(root_path.join("Source/Game")).expect("source dir");
    std::fs::write(root_path.join("Game.uproject"), "{}").expect("uproject");
    std::fs::write(root_path.join("Source/Game/Game.Build.cs"), "").expect("build cs");
    let root = root_path.to_string_lossy().to_string();
    write_project_config(
        &root,
        ProjectConfig {
            editor: "zed".into(),
            unreal: UnrealConfig {
                known_paths: Vec::new(),
                hide_generated_files: false,
                exclude_engine_references: false,
                hide_plugins: false,
            },
            ..ProjectConfig::default()
        },
    )
    .expect("write empty config");
    ensure_unreal_defaults(&root).expect("ensure defaults");
    let config = read_project_config(&root).expect("read config");
    assert!(config
        .unreal
        .known_paths
        .iter()
        .any(|p| p == "Source/Game/Public"));
    assert!(!config.unreal.hide_generated_files, "preserve user toggle");
    assert!(!config.unreal.hide_plugins, "preserve hide-plugins toggle");
    assert_eq!(config.editor, "zed", "preserve the project editor");
}

#[test]
fn skip_plugins_walk_defaults_on_for_unreal_roots() {
    let temp = tempfile::tempdir().expect("tempdir");
    let root_path = temp.path();
    std::fs::write(root_path.join("Game.uproject"), "{}").expect("uproject");
    let root = root_path.to_string_lossy().to_string();
    assert!(should_skip_plugins_walk(&root));
}

#[test]
fn skip_plugins_walk_respects_config_false() {
    let temp = tempfile::tempdir().expect("tempdir");
    let root_path = temp.path();
    std::fs::write(root_path.join("Game.uproject"), "{}").expect("uproject");
    let root = root_path.to_string_lossy().to_string();
    write_project_config(
        &root,
        ProjectConfig {
            unreal: UnrealConfig {
                hide_plugins: false,
                ..UnrealConfig::default()
            },
            ..ProjectConfig::default()
        },
    )
    .expect("write config");
    assert!(!should_skip_plugins_walk(&root));
}

#[test]
fn skip_plugins_walk_ignores_non_unreal_roots() {
    let temp = tempfile::tempdir().expect("tempdir");
    let root = temp.path().to_string_lossy().to_string();
    assert!(!should_skip_plugins_walk(&root));
}

#[test]
fn a_config_without_ignored_paths_reads_as_an_empty_list() {
    let source = memory(&[(
        CONFIG_PATH,
        r#"{"editor":"code","unreal":{"knownPaths":[],"hideGeneratedFiles":true,"excludeEngineReferences":true,"hidePlugins":true}}"#,
    )]);
    assert!(source_config(&source).ignored_paths.is_empty());
}

#[test]
fn ignored_paths_are_normalized_and_deduped() {
    let source = memory(&[(
        CONFIG_PATH,
        r#"{"ignoredPaths":["  Source\\ThirdParty/ ","Source/ThirdParty","","vendor/"]}"#,
    )]);
    assert_eq!(
        source_config(&source).ignored_paths,
        vec!["Source/ThirdParty".to_string(), "vendor".to_string()]
    );
}

/// `unreal` is `#[serde(default)]`, so a hand-written partial config keeps its
/// `ignoredPaths` instead of failing to parse and losing them to
/// `ProjectConfig::default()`. The Unreal toggles still land on their (on)
/// defaults — the app's modals always write the whole config, so only hand-edits
/// see this.
#[test]
fn a_partial_config_keeps_its_ignored_paths() {
    let source = memory(&[(CONFIG_PATH, r#"{"ignoredPaths":["vendor"]}"#)]);
    assert_eq!(
        source_config(&source).ignored_paths,
        vec!["vendor".to_string()]
    );
}

#[test]
fn no_config_file_means_ignore_nothing() {
    let source = memory(&[("src/a.ts", "")]);
    assert!(source_config(&source).ignored_paths.is_empty());
}
