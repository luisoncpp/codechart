// @Architecture(descriptionShort="MCP resources: live session context and review notes snapshots")
use super::tools::{pretty, ToolContext, INTERNAL_ERROR, INVALID_PARAMS};
use serde_json::{json, Value};

const ACTIVE_SESSION: &str = "codechart://session/active";
const REVIEW_NOTES: &str = "codechart://review/notes";
const JSON_MIME: &str = "application/json";

pub(crate) fn list() -> Value {
    json!({ "resources": [
        {
            "uri": ACTIVE_SESSION,
            "name": "active-session",
            "description": "Live snapshot of the active CodeChart window context",
            "mimeType": JSON_MIME,
        },
        {
            "uri": REVIEW_NOTES,
            "name": "review-notes",
            "description": "Current human Review Notes, findings, and reviewed-file progress",
            "mimeType": JSON_MIME,
        },
    ]})
}

pub(crate) fn read(ctx: &mut ToolContext, params: &Value) -> Result<Value, (i64, String)> {
    let uri = params["uri"].as_str().unwrap_or_default();
    let data = match uri {
        ACTIVE_SESSION => ctx.bridge.call("get_active_context", &json!({})),
        REVIEW_NOTES => ctx.bridge.call("get_review_state", &json!({ "includeResolved": true })),
        _ => return Err((INVALID_PARAMS, format!("Resource {uri} not found"))),
    };
    let data = data.map_err(|err| (INTERNAL_ERROR, err))?;
    Ok(json!({ "contents": [{ "uri": uri, "mimeType": JSON_MIME, "text": pretty(&data) }] }))
}
