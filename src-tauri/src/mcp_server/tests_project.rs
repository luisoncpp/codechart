use super::bridge_client::BridgeClient;
use super::tests::{call, ctx_with_registry, run, tool_error, tool_json, write_registry};
use super::tool_project::{gui_executable_for, loaded_outcome, same_path};
use super::tools::ToolContext;
use crate::mcp_bridge::{spawn_http_server, BridgeReply, DispatchFn};
use serde_json::{json, Value};
use std::path::Path;
use std::sync::{Arc, Mutex};

/// A window whose `open_project` loads instantly into `phase` (or that starts on `loaded`).
fn fake_window(token: &str, loaded: Option<String>, phase: &'static str) -> u16 {
    let root = Arc::new(Mutex::new(loaded));
    let dispatch: DispatchFn = Arc::new(/*answerLikeTheWindow*/ move |req| {
        let mut root = root.lock().unwrap();
        let result = match req.method.as_str() {
            "open_project" => {
                *root = req.params["path"].as_str().map(str::to_string);
                json!({ "projectRoot": *root })
            }
            "get_active_context" => json!({ "projectRoot": *root, "phase": if root.is_some() { phase } else { "idle" } }),
            other => return Ok(BridgeReply { result: None, error: Some(format!("unexpected {other}")) }),
        };
        Ok(BridgeReply { result: Some(result), error: None })
    });
    spawn_http_server(token.to_string(), dispatch).unwrap()
}

fn project_path(dir: &Path) -> String {
    std::path::absolute(dir).unwrap().to_string_lossy().into_owned()
}

#[test]
fn opens_the_folder_in_the_running_window_and_waits_for_ready() {
    let dir = tempfile::tempdir().unwrap();
    let registry = dir.path().join("instances.json");
    write_registry(&registry, fake_window("t", None, "ready"), "t");
    let replies = run(ctx_with_registry(&registry), &[call(1, "open_project", json!({ "path": dir.path() }))]);
    let context = tool_json(&replies[0]);
    assert_eq!(context["window"], "existing");
    assert_eq!(context["phase"], "ready");
    assert_eq!(context["projectRoot"], project_path(dir.path()));
}

#[test]
fn launches_codechart_on_the_folder_when_no_window_runs() {
    let dir = tempfile::tempdir().unwrap();
    let registry = dir.path().join("instances.json");
    let launched = Arc::new(Mutex::new(Vec::<String>::new()));
    let (seen, registry_for_launch) = (launched.clone(), registry.clone());
    let ctx = ToolContext {
        bridge: BridgeClient::new(Some(registry.clone())),
        env_root: None,
        launch_app: Box::new(/*startFakeWindowOnProject*/ move |project| {
            seen.lock().unwrap().push(project.to_string());
            write_registry(&registry_for_launch, fake_window("t", Some(project.to_string()), "ready"), "t");
            Ok(())
        }),
    };
    let replies = run(ctx, &[call(1, "open_project", json!({ "path": dir.path() }))]);
    let context = tool_json(&replies[0]);
    assert_eq!(context["window"], "launched");
    assert_eq!(*launched.lock().unwrap(), vec![project_path(dir.path())]);
}

#[test]
fn rejects_a_path_that_is_not_a_folder() {
    let dir = tempfile::tempdir().unwrap();
    let file = dir.path().join("file.txt");
    std::fs::write(&file, "x").unwrap();
    let replies = run(ctx_with_registry(&dir.path().join("none.json")), &[call(1, "open_project", json!({ "path": file }))]);
    assert!(tool_error(&replies[0]).starts_with("Not a folder"));
}

#[test]
fn gives_up_when_the_analysis_outlasts_the_timeout() {
    let dir = tempfile::tempdir().unwrap();
    let registry = dir.path().join("instances.json");
    write_registry(&registry, fake_window("t", None, "loading"), "t");
    let args = json!({ "path": dir.path(), "timeoutSeconds": 1 });
    let replies = run(ctx_with_registry(&registry), &[call(1, "open_project", args)]);
    assert!(tool_error(&replies[0]).starts_with("Timed out waiting for CodeChart"));
}

#[test]
fn only_a_finished_load_of_the_same_folder_ends_the_wait() {
    let context = |root: Value, phase: &str| json!({ "projectRoot": root, "phase": phase, "error": "boom" });
    assert!(loaded_outcome(&context(json!("C:/repo"), "loading"), "C:/repo").is_none());
    assert!(loaded_outcome(&context(json!("C:/other"), "ready"), "C:/repo").is_none());
    assert!(loaded_outcome(&context(Value::Null, "idle"), "C:/repo").is_none());
    assert!(loaded_outcome(&context(json!("C:/repo"), "empty"), "C:/repo").unwrap().is_ok());
    let failed = loaded_outcome(&context(json!("C:/repo"), "failed"), "C:/repo").unwrap();
    assert_eq!(failed.unwrap_err(), "CodeChart could not load C:/repo: boom");
}

#[test]
fn path_comparison_ignores_separators_trailing_slash_and_verbatim_prefix() {
    assert!(same_path(r"\\?\C:\repo\app\", "C:/repo/app"));
    assert!(!same_path("C:/repo/app", "C:/repo/app2"));
    assert_eq!(cfg!(windows), same_path("C:/Repo", "c:/repo"));
}

#[test]
fn the_cli_binary_launches_its_sibling_desktop_app() {
    let dir = Path::new("target").join("debug");
    let exe = std::env::consts::EXE_SUFFIX;
    let cli = dir.join(format!("codechart-cli{exe}"));
    assert_eq!(gui_executable_for(&cli), dir.join(format!("codechart{exe}")));
    let gui = dir.join(format!("codechart{exe}"));
    assert_eq!(gui_executable_for(&gui), gui);
}
