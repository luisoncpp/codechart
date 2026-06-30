use std::collections::HashMap;

use super::*;
use crate::project_source::MemoryProjectSource;

fn memory(files: &[(&str, &str)]) -> MemoryProjectSource {
    let map: HashMap<String, String> =
        files.iter().map(|(p, c)| ((*p).to_string(), (*c).to_string())).collect();
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
}

#[test]
fn read_write_project_config_round_trips() {
    let temp = tempfile::tempdir().expect("tempdir");
    let root = temp.path().to_string_lossy().to_string();
    let config = ProjectConfig {
        unreal: UnrealConfig {
            known_paths: vec!["Source/Game/Public".into()],
            hide_generated_files: false,
            exclude_engine_references: true,
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
            unreal: UnrealConfig {
                known_paths: Vec::new(),
                hide_generated_files: false,
                exclude_engine_references: false,
            },
        },
    )
    .expect("write empty config");
    ensure_unreal_defaults(&root).expect("ensure defaults");
    let config = read_project_config(&root).expect("read config");
    assert!(config.unreal.known_paths.iter().any(|p| p == "Source/Game/Public"));
    assert!(!config.unreal.hide_generated_files, "preserve user toggle");
}
