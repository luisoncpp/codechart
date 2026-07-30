// @Architecture(descriptionShort="Crate root: Tauri bootstrap and module exports")

pub mod analysis;
pub mod contract;
pub mod diagnostics;
pub mod diff_reviews;
pub mod git;
pub mod grouping;
pub mod language_adapter;
pub mod project_config;
pub mod project_source;
pub mod references;
pub mod review_notes;
pub mod search;
pub mod semantic_comments;
pub mod tauri_api;
pub mod unity_assets;
pub mod unreal_config;

pub use search::{search_sources, SearchResult};
pub use unreal_config::{
    ensure_unreal_defaults, read_project_config, unreal_options_from_source, write_project_config,
    ProjectConfig, UnrealOptions,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            tauri_api::analyze_project,
            tauri_api::load_project_snapshot,
            tauri_api::read_module_source,
            tauri_api::search_module_sources,
            tauri_api::read_project_config,
            tauri_api::write_project_config,
            tauri_api::git_is_repo,
            tauri_api::git_list_commits,
            tauri_api::git_diff_refs,
            tauri_api::git_diff_working_tree,
            tauri_api::load_review_notes,
            tauri_api::save_review_notes,
            tauri_api::load_diff_review,
            tauri_api::save_diff_review,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
