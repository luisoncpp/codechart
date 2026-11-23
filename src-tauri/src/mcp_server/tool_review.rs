// @Architecture(descriptionShort="MCP tools for human review state, finding status, and MR comment export")
use super::diff_shas::{resolve_diff_shas, PartialShas};
use super::export::{format_review_export, ExportInput};
use super::headless::{fallback_root, review_state};
use super::tools::{forward, object_schema, str_arg, ToolContext, ToolDef};
use serde_json::{json, Value};

pub(crate) fn tools() -> Vec<ToolDef> {
    vec![get_review_state(), set_files_reviewed(), resolve_finding(), export_review_comments()]
}

fn get_review_state() -> ToolDef {
    ToolDef {
        name: "get_review_state",
        description: "Read reviewed/unreviewed diff paths, human-authored Review Notes, cohorts, and finding statuses from CodeChart.",
        input_schema: object_schema(
            json!({ "includeResolved": { "type": "boolean", "description": "Include resolved/dismissed findings." } }),
            &[],
        ),
        handler: forward,
    }
}

fn set_files_reviewed() -> ToolDef {
    ToolDef {
        name: "set_files_reviewed",
        description: "Mark one or more diffed file paths as reviewed or unreviewed in CodeChart.",
        input_schema: object_schema(
            json!({
                "paths": { "type": "array", "items": { "type": "string" } },
                "reviewed": { "type": "boolean" },
            }),
            &["paths", "reviewed"],
        ),
        handler: forward,
    }
}

fn resolve_finding() -> ToolDef {
    ToolDef {
        name: "resolve_finding",
        description: "Update the status of a Review Stack finding (open, resolved, or dismissed).",
        input_schema: object_schema(
            json!({
                "findingId": { "type": "string" },
                "status": { "type": "string", "enum": ["open", "resolved", "dismissed"] },
            }),
            &["findingId", "status"],
        ),
        handler: forward,
    }
}

fn export_review_comments() -> ToolDef {
    ToolDef {
        name: "export_review_comments",
        description: "Export unresolved findings and human Review Notes formatted for Markdown, GitHub PR Reviews API, \
            or GitLab MR Discussions API. Works both with a live CodeChart window and headlessly via projectRoot.",
        input_schema: object_schema(
            json!({
                "format": { "type": "string", "enum": ["markdown", "github", "gitlab"], "default": "markdown" },
                "includeResolved": { "type": "boolean", "default": false },
                "includeReviewNotes": { "type": "boolean", "default": true },
                "projectRoot": { "type": "string", "description": "Optional project root for headless disk read." },
                "diffId": { "type": "string", "description": "Optional diffId when reading headlessly." },
                "baseSha": { "type": "string", "description": "GitLab position.base_sha (default: merge-base from the diffId refs)." },
                "startSha": { "type": "string", "description": "GitLab position.start_sha (default: the diff's base ref)." },
                "headSha": { "type": "string", "description": "GitLab position.head_sha (default: the diff's head ref)." },
            }),
            &[],
        ),
        handler: export_comments,
    }
}

fn export_comments(ctx: &mut ToolContext, _name: &str, args: &Value) -> Result<Value, String> {
    let (state, root) = load_export_state(ctx, args)?;
    let format = args["format"].as_str().unwrap_or("markdown");
    let mut input: ExportInput =
        serde_json::from_value(state).map_err(|err| format!("Unreadable review state: {err}"))?;
    input.include_review_notes = args["includeReviewNotes"].as_bool().unwrap_or(true);
    if format == "gitlab" {
        let provided = PartialShas {
            base: str_arg(args, "baseSha"),
            start: str_arg(args, "startSha"),
            head: str_arg(args, "headSha"),
            warning: None,
        };
        input.diff_shas = resolve_diff_shas(root.as_deref(), input.diff_id.as_deref(), &provided);
    }
    Ok(format_review_export(format, &input))
}

/// Live review state (+ the window's project root), else the headless `.codechart/` files.
fn load_export_state(ctx: &mut ToolContext, args: &Value) -> Result<(Value, Option<String>), String> {
    let include_resolved = args["includeResolved"].as_bool().unwrap_or(false);
    let fallback = fallback_root(args["projectRoot"].as_str(), ctx.env_root.as_deref());
    match ctx.bridge.call("get_review_state", &json!({ "includeResolved": include_resolved })) {
        Ok(state) => {
            let context = ctx.bridge.call("get_active_context", &json!({})).unwrap_or(Value::Null);
            let live_root = str_arg(&context, "projectRoot");
            Ok((state, live_root.or(fallback)))
        }
        Err(live_err) => {
            let root = fallback.ok_or(live_err)?;
            let state = review_state(&root, args["diffId"].as_str(), include_resolved)?;
            Ok((state, Some(root)))
        }
    }
}
