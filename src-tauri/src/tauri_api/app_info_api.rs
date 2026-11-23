// @Architecture(descriptionShort="Tauri IPC command exposing the running executable's path (Help → MCP server config)")

/// Absolute path of the running `codechart` executable, so Help can print a ready-to-paste
/// `codechart --mcp` registration. `None` when the OS cannot report it.
#[tauri::command(async)]
pub fn get_executable_path() -> Option<String> {
    std::env::current_exe().ok().map(|path| path.to_string_lossy().into_owned())
}
