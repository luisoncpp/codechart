// @Architecture(descriptionShort="MCP open_project tool: loads a folder in the live window, or launches CodeChart on it, then waits for the analysis")
use super::tools::{object_schema, str_arg, ToolContext, ToolDef};
use serde_json::{json, Value};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

const DEFAULT_TIMEOUT_SECS: u64 = 300;
const POLL_INTERVAL: Duration = Duration::from_millis(500);
const CLI_STEM: &str = "codechart-cli";
const GUI_STEM: &str = "codechart";

pub(crate) fn tools() -> Vec<ToolDef> {
    vec![ToolDef {
        name: "open_project",
        description: "Open a project folder in CodeChart Desktop and wait until it is analyzed. Reuses the running \
            window (replacing its project, like File → Open; a no-op when that folder is already loaded), or \
            launches CodeChart on the folder when no window is running. Returns the window context.",
        input_schema: object_schema(
            json!({
                "path": { "type": "string", "description": "Project root folder (absolute, or relative to the MCP server's working directory)." },
                "timeoutSeconds": { "type": "integer", "minimum": 1, "maximum": 3600, "default": DEFAULT_TIMEOUT_SECS, "description": "How long to wait for the analysis to finish." },
            }),
            &["path"],
        ),
        handler: open_project,
    }]
}

fn open_project(ctx: &mut ToolContext, _name: &str, args: &Value) -> Result<Value, String> {
    let path = project_dir(args)?;
    let timeout = Duration::from_secs(args["timeoutSeconds"].as_u64().unwrap_or(DEFAULT_TIMEOUT_SECS));
    let deadline = Instant::now() + timeout;
    let window = if ctx.bridge.has_live_instance() {
        ctx.bridge.call("open_project", &json!({ "path": path }))?;
        "existing"
    } else {
        (ctx.launch_app)(&path)?;
        "launched"
    };
    let mut context = wait_until_loaded(ctx, &path, deadline)?;
    context["window"] = json!(window);
    Ok(context)
}

/// `path` as an absolute directory; anything else is an argument error.
fn project_dir(args: &Value) -> Result<String, String> {
    let raw = str_arg(args, "path").ok_or("open_project requires a path.")?;
    let absolute = std::path::absolute(&raw).map_err(|err| format!("Invalid path {raw}: {err}"))?;
    if !absolute.is_dir() {
        return Err(format!("Not a folder: {}", absolute.display()));
    }
    Ok(absolute.to_string_lossy().into_owned())
}

/// Polls `get_active_context` until the window shows `path` analyzed; a starting window may not answer yet.
fn wait_until_loaded(ctx: &mut ToolContext, path: &str, deadline: Instant) -> Result<Value, String> {
    loop {
        if let Ok(context) = ctx.bridge.call("get_active_context", &json!({})) {
            if let Some(outcome) = loaded_outcome(&context, path) {
                return outcome;
            }
        }
        if Instant::now() >= deadline {
            return Err(format!(
                "Timed out waiting for CodeChart to finish loading {path}. It may still be analyzing: \
                 call get_active_context later and check that phase is \"ready\"."
            ));
        }
        std::thread::sleep(POLL_INTERVAL);
    }
}

/// `None` while the window is still on another project or loading this one.
pub(crate) fn loaded_outcome(context: &Value, path: &str) -> Option<Result<Value, String>> {
    let root = context["projectRoot"].as_str()?;
    if !same_path(root, path) {
        return None;
    }
    match context["phase"].as_str()? {
        "ready" | "empty" => Some(Ok(context.clone())),
        "failed" => {
            let reason = context["error"].as_str().unwrap_or("unknown error");
            Some(Err(format!("CodeChart could not load {path}: {reason}")))
        }
        _ => None,
    }
}

/// Ignores separators, a trailing slash, the `\\?\` verbatim prefix and (on Windows) letter case.
pub(crate) fn same_path(a: &str, b: &str) -> bool {
    comparable(a) == comparable(b)
}

fn comparable(path: &str) -> String {
    let unprefixed = path.strip_prefix(r"\\?\").unwrap_or(path).replace('\\', "/");
    let trimmed = unprefixed.trim_end_matches('/');
    if cfg!(windows) {
        trimmed.to_lowercase()
    } else {
        trimmed.to_string()
    }
}

/// Starts the desktop app on `project`, detached, with no handle on this process's stdio (stdout is the protocol).
pub(crate) fn launch_gui(project: &str) -> Result<(), String> {
    let current = std::env::current_exe().map_err(|err| format!("Cannot locate the CodeChart executable: {err}"))?;
    let exe = gui_executable_for(&current);
    let mut command = Command::new(&exe);
    command.arg("--project").arg(project).stdin(Stdio::null()).stdout(Stdio::null()).stderr(Stdio::null());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const DETACHED_PROCESS: u32 = 0x0000_0008;
        const CREATE_NEW_PROCESS_GROUP: u32 = 0x0000_0200;
        command.creation_flags(DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP);
    }
    command.spawn().map(drop).map_err(|err| format!("Failed to start {}: {err}", exe.display()))
}

/// `codechart.exe --mcp` relaunches itself; `codechart-cli mcp` (source checkout) uses the sibling GUI binary.
pub(crate) fn gui_executable_for(current: &Path) -> PathBuf {
    let is_cli = current.file_stem().is_some_and(|stem| stem == CLI_STEM);
    if !is_cli {
        return current.to_path_buf();
    }
    current.with_file_name(format!("{GUI_STEM}{}", std::env::consts::EXE_SUFFIX))
}
