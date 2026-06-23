// @Architecture(descriptionShort="Tauri desktop binary entrypoint delegating to the library crate")

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    codechart_lib::run()
}
