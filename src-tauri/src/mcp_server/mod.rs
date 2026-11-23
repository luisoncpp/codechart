// @Architecture(descriptionShort="Stdio MCP server (codechart.exe --mcp): JSON-RPC loop proxying to the live window with headless fallbacks")
mod bridge_client;
mod diff_shas;
mod export;
mod headless;
mod protocol;
mod resources;
mod schema;
mod tool_canvas;
mod tool_context;
mod tool_project;
mod tool_review;
mod tool_stack;
mod tools;

#[cfg(test)]
mod tests;
#[cfg(test)]
mod tests_export;
#[cfg(test)]
mod tests_project;

use crate::mcp_bridge::default_registry_path;
use bridge_client::BridgeClient;
use protocol::Server;
use std::io::{BufRead, Write};
use std::process::ExitCode;
use tools::ToolContext;

/// Command-line flag that turns `codechart.exe` into the MCP server instead of opening a window.
pub const MCP_FLAG: &str = "--mcp";

/// Serve MCP over this process's stdin/stdout until stdin closes.
pub fn run_stdio_process() -> ExitCode {
    let ctx = ToolContext {
        bridge: BridgeClient::new(default_registry_path()),
        env_root: std::env::var("CODECHART_PROJECT_ROOT").ok(),
        launch_app: Box::new(tool_project::launch_gui),
    };
    match serve(std::io::stdin().lock(), std::io::stdout().lock(), ctx) {
        Ok(()) => ExitCode::SUCCESS,
        Err(err) => {
            eprintln!("codechart-mcp fatal: {err}");
            ExitCode::FAILURE
        }
    }
}

/// One JSON-RPC message per line in, one reply per line out (notifications get none).
pub(crate) fn serve<R: BufRead, W: Write>(input: R, mut output: W, ctx: ToolContext) -> std::io::Result<()> {
    let mut server = Server::new(ctx);
    for line in input.lines() {
        let line = line?;
        if line.trim().is_empty() {
            continue;
        }
        let Some(reply) = server.handle_line(&line) else {
            continue;
        };
        writeln!(output, "{reply}")?;
        output.flush()?;
    }
    Ok(())
}
