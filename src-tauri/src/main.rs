// @Architecture(descriptionShort="Tauri desktop binary entrypoint delegating to the library crate")

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::ExitCode;

fn main() -> ExitCode {
    // `codechart.exe --mcp`: stdio MCP server for coding assistants; no window opens.
    // Piped stdin/stdout still reach a windows-subsystem process, so this works in release too.
    if std::env::args().nth(1).as_deref() == Some(codechart_lib::mcp_server::MCP_FLAG) {
        return codechart_lib::mcp_server::run_stdio_process();
    }
    codechart_lib::run();
    ExitCode::SUCCESS
}
