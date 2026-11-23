// @Architecture(descriptionShort="Crate root: Tauri bootstrap and module exports")

pub mod analysis;
pub mod cli;
pub mod contract;
pub mod diagnostics;
pub mod diff_impact;
pub mod diff_reviews;
pub mod git;
pub mod grouping;
pub mod language_adapter;
pub mod mcp_bridge;
pub mod mcp_server;
pub mod project_config;
pub mod project_source;
pub mod references;
pub mod review_notes;
pub mod review_stacks;
pub mod search;
pub mod semantic_comments;
pub mod startup_args;
pub mod tauri_api;
pub mod tsconfig_paths;
pub mod unity_assets;
pub mod unreal_config;

pub use search::{search_sources, SearchResult};
pub use startup_args::StartupProjectPath;
pub use unreal_config::{
    analysis_fs_source, ensure_unreal_defaults, is_unreal_project, read_project_config,
    should_skip_plugins_walk, source_config, unreal_options_from_source, write_project_config,
    ProjectConfig, SourceConfig, UnrealOptions, CONFIG_PATH,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let args: Vec<String> = std::env::args().collect();
    let env_project = std::env::var("CODECHART_STARTUP_PROJECT").ok();
    let startup_path = startup_args::resolve_startup_project_path(&args, env_project.as_deref());
    let bridge_state = std::sync::Arc::new(mcp_bridge::McpBridgeState::new());
    let bridge_for_setup = std::sync::Arc::clone(&bridge_state);
    let bridge_for_exit = std::sync::Arc::clone(&bridge_state);
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(startup_args::StartupProjectPath(startup_path))
        .manage(bridge_state)
        .setup(move |app| {
            #[cfg(debug_assertions)]
            apply_debug_window_size(app);
            let _ = mcp_bridge::start_tauri_bridge(app.handle().clone(), bridge_for_setup);
            Ok(())
        })
        .on_window_event(move |_window, event| {
            if matches!(event, tauri::WindowEvent::Destroyed) {
                bridge_for_exit.cleanup_registry();
            }
        })
        .invoke_handler(tauri::generate_handler![
            tauri_api::get_startup_project_path,
            tauri_api::get_executable_path,
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
            tauri_api::git_list_submodule_paths,
            tauri_api::load_review_notes,
            tauri_api::save_review_notes,
            tauri_api::load_diff_review,
            tauri_api::save_diff_review,
            tauri_api::clear_diff_reviews,
            tauri_api::load_review_stack,
            tauri_api::save_review_stack,
            tauri_api::delete_review_stack,
            tauri_api::clear_review_stacks,
            tauri_api::analyze_diff_impact,
            tauri_api::compute_module_blast_radius,
            tauri_api::mcp_bridge_respond,
            tauri_api::toggle_devtools,
            tauri_api::set_window_size,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(debug_assertions)]
fn apply_debug_window_size(app: &tauri::App) {
    use tauri::Manager;
    let Ok(raw) = std::env::var("CODECHART_WINDOW_SIZE") else {
        return;
    };
    let Some((width, height)) = startup_args::parse_window_size(&raw) else {
        return;
    };
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_size(tauri::LogicalSize::new(width, height));
    }
}
