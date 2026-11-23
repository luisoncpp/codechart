// @Architecture(descriptionShort="MCP tool table types, shared call context, JSON-RPC error codes, and schema helpers")
use super::bridge_client::BridgeClient;
use serde_json::{json, Map, Value};

pub(crate) const INVALID_PARAMS: i64 = -32602;
pub(crate) const INTERNAL_ERROR: i64 = -32603;

/// Runs one tool call: `(context, tool name, normalized arguments)`.
pub(crate) type Handler = fn(&mut ToolContext, &str, &Value) -> Result<Value, String>;

pub(crate) struct ToolDef {
    pub name: &'static str,
    pub description: &'static str,
    pub input_schema: Value,
    pub handler: Handler,
}

/// Starts CodeChart Desktop on a project folder (`open_project` with no window running).
pub(crate) type Launcher = Box<dyn Fn(&str) -> Result<(), String>>;

pub(crate) struct ToolContext {
    pub bridge: BridgeClient,
    /// `CODECHART_PROJECT_ROOT`: default `projectRoot` for headless fallbacks.
    pub env_root: Option<String>,
    pub launch_app: Launcher,
}

/// Forwards the call verbatim to the live window's RPC method of the same name.
pub(crate) fn forward(ctx: &mut ToolContext, name: &str, args: &Value) -> Result<Value, String> {
    ctx.bridge.call(name, args)
}

pub(crate) fn object_schema(properties: Value, required: &[&str]) -> Value {
    json!({ "type": "object", "properties": properties, "required": required })
}

/// `path` / `side` / `startLine` / `endLine` plus `extra` properties; all of `extra_required` required.
pub(crate) fn line_range_object(extra: Value, extra_required: &[&str]) -> Value {
    let mut props: Map<String, Value> = json!({
        "path": { "type": "string" },
        "side": { "type": "string", "enum": ["before", "after"], "default": "after" },
        "startLine": { "type": "integer", "minimum": 1 },
        "endLine": { "type": "integer", "minimum": 1 },
    })
    .as_object()
    .cloned()
    .unwrap_or_default();
    props.extend(extra.as_object().cloned().unwrap_or_default());
    let mut required = vec!["path", "startLine", "endLine"];
    required.extend_from_slice(extra_required);
    object_schema(Value::Object(props), &required)
}

pub(crate) fn str_arg(args: &Value, key: &str) -> Option<String> {
    args[key].as_str().map(str::trim).filter(|s| !s.is_empty()).map(str::to_string)
}

pub(crate) fn pretty(value: &Value) -> String {
    serde_json::to_string_pretty(value).unwrap_or_else(|_| value.to_string())
}
