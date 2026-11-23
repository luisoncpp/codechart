// @Architecture(descriptionShort="MCP tools for window context, architecture summary, and diff impact, with headless fallback")
use super::headless::{architecture_summary, diff_impact, fallback_root};
use super::tools::{forward, object_schema, ToolContext, ToolDef};
use serde_json::{json, Value};

const PROJECT_ROOT_DESCRIPTION: &str =
    "Optional project directory for headless fallback when CodeChart GUI is closed.";

pub(crate) fn tools() -> Vec<ToolDef> {
    vec![active_context(), summary(), impact()]
}

fn active_context() -> ToolDef {
    ToolDef {
        name: "get_active_context",
        description: "Inspect the active CodeChart window: open project root, zoom level, selected module/group, \
            active diff id, reviewed count, and active cohort/blast-radius state.",
        input_schema: object_schema(json!({}), &[]),
        handler: forward,
    }
}

fn summary() -> ToolDef {
    ToolDef {
        name: "get_architecture_summary",
        description: "Return the analyzed ProjectGraph group hierarchy, facades, tags, module/edge counts, and current \
            architecture diagnostics. Falls back to headless analysis when the desktop window is closed if \
            projectRoot is provided.",
        input_schema: object_schema(
            json!({
                "groupId": { "type": "string", "description": "Optional group id to scope the summary." },
                "projectRoot": { "type": "string", "description": PROJECT_ROOT_DESCRIPTION },
            }),
            &[],
        ),
        handler: summary_with_fallback,
    }
}

fn impact() -> ToolDef {
    ToolDef {
        name: "analyze_diff_impact",
        description: "Compute foundation-first topological layers of changed modules, transitive blast radius \
            (downstream dependents with hop depth), and newly introduced architecture diagnostics. Falls back to \
            headless analysis when the desktop window is closed if projectRoot is provided.",
        input_schema: object_schema(
            json!({
                "mode": { "type": "string", "enum": ["commits", "working-tree", "paste"] },
                "baseRef": { "type": "string", "description": "Git base ref (for commits or working-tree mode)." },
                "headRef": { "type": "string", "description": "Git head ref (for commits mode)." },
                "diffText": { "type": "string", "description": "Unified diff text (for paste mode)." },
                "maxDepth": { "type": "integer", "minimum": 1, "maximum": 8, "description": "Max reverse-BFS hops (default 3)." },
                "projectRoot": { "type": "string", "description": PROJECT_ROOT_DESCRIPTION },
            }),
            &[],
        ),
        handler: impact_with_fallback,
    }
}

fn summary_with_fallback(ctx: &mut ToolContext, name: &str, args: &Value) -> Result<Value, String> {
    let live_err = match ctx.bridge.call(name, args) {
        Ok(live) => return Ok(live),
        Err(err) => err,
    };
    let root = fallback_root(args["projectRoot"].as_str(), ctx.env_root.as_deref()).ok_or(live_err)?;
    architecture_summary(&root, args["groupId"].as_str())
}

fn impact_with_fallback(ctx: &mut ToolContext, name: &str, args: &Value) -> Result<Value, String> {
    let live_err = match ctx.bridge.call(name, args) {
        Ok(live) => return Ok(live),
        Err(err) => err,
    };
    let root = fallback_root(args["projectRoot"].as_str(), ctx.env_root.as_deref()).ok_or(live_err)?;
    diff_impact(&root, args)
}
