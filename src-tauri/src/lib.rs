// @Architecture(descriptionShort="Crate root: Tauri bootstrap and module exports")

pub mod analysis;
pub mod git;
pub mod contract;
pub mod diagnostics;
pub mod grouping;
pub mod language_adapter;
pub mod project_config;
pub mod project_source;
pub mod references;
pub mod semantic_comments;
pub mod tauri_api;
pub mod unity_assets;
pub mod unreal_config;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            tauri_api::analyze_project,
            tauri_api::analyze_project_at_ref,
            tauri_api::read_module_source,
            tauri_api::read_project_config,
            tauri_api::write_project_config,
            tauri_api::git_is_repo,
            tauri_api::git_list_commits,
            tauri_api::git_diff_refs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
