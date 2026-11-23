// @Architecture(descriptionShort="MCP JSON-RPC method dispatch: initialize, tools/list, tools/call, resources")
use super::schema::normalize;
use super::tools::{pretty, ToolContext, ToolDef, INVALID_PARAMS};
use super::{resources, tool_canvas, tool_context, tool_review, tool_stack};
use serde_json::{json, Value};

const PARSE_ERROR: i64 = -32700;
const INVALID_REQUEST: i64 = -32600;
const METHOD_NOT_FOUND: i64 = -32601;
/// Newest first; the reply echoes the client's version when it is one of these.
const PROTOCOL_VERSIONS: [&str; 4] = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
const SERVER_NAME: &str = "codechart-review";

type RpcResult = Result<Value, (i64, String)>;

pub(crate) struct Server {
    ctx: ToolContext,
    tools: Vec<ToolDef>,
}

impl Server {
    pub fn new(ctx: ToolContext) -> Self {
        let mut tools = tool_context::tools();
        tools.extend(tool_stack::tools());
        tools.extend(tool_canvas::tools());
        tools.extend(tool_review::tools());
        Self { ctx, tools }
    }

    /// Reply to one incoming line; `None` for notifications and client responses.
    pub fn handle_line(&mut self, line: &str) -> Option<Value> {
        let msg: Value = match serde_json::from_str(line) {
            Ok(msg) => msg,
            Err(err) => return Some(error_reply(Value::Null, (PARSE_ERROR, format!("Parse error: {err}")))),
        };
        if !msg.is_object() {
            return Some(error_reply(Value::Null, (INVALID_REQUEST, "Expected a JSON-RPC object".into())));
        }
        let id = msg.get("id").cloned()?;
        let Some(method) = msg["method"].as_str() else {
            let is_response = msg.get("result").is_some() || msg.get("error").is_some();
            return (!is_response).then(|| error_reply(id, (INVALID_REQUEST, "Missing method".into())));
        };
        Some(match self.dispatch(method, &msg["params"]) {
            Ok(result) => json!({ "jsonrpc": "2.0", "id": id, "result": result }),
            Err(err) => error_reply(id, err),
        })
    }

    fn dispatch(&mut self, method: &str, params: &Value) -> RpcResult {
        match method {
            "initialize" => Ok(initialize_result(params)),
            "ping" => Ok(json!({})),
            "tools/list" => Ok(self.list_tools()),
            "tools/call" => self.call_tool(params),
            "resources/list" => Ok(resources::list()),
            "resources/templates/list" => Ok(json!({ "resourceTemplates": [] })),
            "resources/read" => resources::read(&mut self.ctx, params),
            _ => Err((METHOD_NOT_FOUND, format!("Method not found: {method}"))),
        }
    }

    fn list_tools(&self) -> Value {
        let tools: Vec<Value> = self
            .tools
            .iter()
            .map(|t| json!({ "name": t.name, "description": t.description, "inputSchema": t.input_schema }))
            .collect();
        json!({ "tools": tools })
    }

    fn call_tool(&mut self, params: &Value) -> RpcResult {
        let name = params["name"].as_str().unwrap_or_default();
        let Some(tool) = self.tools.iter().find(|t| t.name == name) else {
            return Err((INVALID_PARAMS, format!("Tool {name} not found")));
        };
        let mut args = params.get("arguments").cloned().unwrap_or(Value::Null);
        if args.is_null() {
            args = json!({});
        }
        let outcome = normalize(&tool.input_schema, &mut args)
            .and_then(|()| (tool.handler)(&mut self.ctx, tool.name, &args));
        Ok(tool_result(outcome))
    }
}

fn initialize_result(params: &Value) -> Value {
    let requested = params["protocolVersion"].as_str().unwrap_or_default();
    let version = PROTOCOL_VERSIONS.iter().find(|v| **v == requested).unwrap_or(&PROTOCOL_VERSIONS[0]);
    json!({
        "protocolVersion": version,
        "capabilities": { "tools": { "listChanged": false }, "resources": { "listChanged": false } },
        "serverInfo": { "name": SERVER_NAME, "version": env!("CARGO_PKG_VERSION") },
    })
}

/// Tool failures are results with `isError`, so the assistant reads the message instead of a protocol error.
fn tool_result(outcome: Result<Value, String>) -> Value {
    match outcome {
        Ok(data) => json!({ "content": [{ "type": "text", "text": pretty(&data) }] }),
        Err(message) => json!({ "content": [{ "type": "text", "text": message }], "isError": true }),
    }
}

fn error_reply(id: Value, (code, message): (i64, String)) -> Value {
    json!({ "jsonrpc": "2.0", "id": id, "error": { "code": code, "message": message } })
}
