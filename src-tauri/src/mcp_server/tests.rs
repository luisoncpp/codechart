use super::bridge_client::BridgeClient;
use super::schema::normalize;
use super::serve;
use super::tools::ToolContext;
use crate::mcp_bridge::{spawn_http_server, BridgeReply, DispatchFn};
use serde_json::{json, Value};
use std::path::Path;
use std::sync::Arc;

const FIXTURE: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/../tests/fixtures/ts-basic-project");

pub(super) fn ctx_with_registry(registry: &Path) -> ToolContext {
    ToolContext {
        bridge: BridgeClient::new(Some(registry.to_path_buf())),
        env_root: None,
        launch_app: Box::new(/*refuseLaunch*/ |_| Err("launching is disabled in tests".to_string())),
    }
}

/// Feed `requests` through the stdio loop, one per line, and parse every reply line.
pub(super) fn run(ctx: ToolContext, requests: &[Value]) -> Vec<Value> {
    let input: String = requests.iter().map(|r| format!("{r}\n")).collect();
    let mut output = Vec::new();
    serve(input.as_bytes(), &mut output, ctx).unwrap();
    String::from_utf8(output).unwrap().lines().map(|l| serde_json::from_str(l).unwrap()).collect()
}

pub(super) fn call(id: u64, name: &str, arguments: Value) -> Value {
    json!({ "jsonrpc": "2.0", "id": id, "method": "tools/call", "params": { "name": name, "arguments": arguments } })
}

pub(super) fn tool_json(reply: &Value) -> Value {
    assert_ne!(reply["result"]["isError"], json!(true), "tool failed: {reply}");
    serde_json::from_str(reply["result"]["content"][0]["text"].as_str().unwrap()).unwrap()
}

pub(super) fn tool_error(reply: &Value) -> String {
    assert_eq!(reply["result"]["isError"], json!(true), "expected a tool error: {reply}");
    reply["result"]["content"][0]["text"].as_str().unwrap().to_string()
}

#[test]
fn handshake_lists_all_tools_and_answers_nothing_to_notifications() {
    let dir = tempfile::tempdir().unwrap();
    let replies = run(ctx_with_registry(&dir.path().join("none.json")), &[
        json!({ "jsonrpc": "2.0", "id": 1, "method": "initialize", "params": { "protocolVersion": "2025-03-26" } }),
        json!({ "jsonrpc": "2.0", "method": "notifications/initialized" }),
        json!({ "jsonrpc": "2.0", "id": 2, "method": "tools/list" }),
        json!({ "jsonrpc": "2.0", "id": 3, "method": "ping" }),
        json!({ "jsonrpc": "2.0", "id": 4, "method": "prompts/list" }),
    ]);
    assert_eq!(replies.len(), 4);
    assert_eq!(replies[0]["result"]["protocolVersion"], "2025-03-26");
    assert_eq!(replies[0]["result"]["serverInfo"]["name"], "codechart-review");
    let tools = replies[1]["result"]["tools"].as_array().unwrap();
    assert_eq!(tools.len(), 16);
    assert!(tools.iter().all(|t| t["inputSchema"]["type"] == "object"));
    assert_eq!(replies[2]["result"], json!({}));
    assert_eq!(replies[3]["error"]["code"], -32601);
}

#[test]
fn malformed_lines_and_unknown_tools_are_protocol_errors() {
    let dir = tempfile::tempdir().unwrap();
    let replies = run(ctx_with_registry(&dir.path().join("none.json")), &[
        json!("not an object"),
        call(1, "no_such_tool", json!({})),
    ]);
    assert_eq!(replies[0]["error"]["code"], -32600);
    assert_eq!(replies[1]["error"]["code"], -32602);

    let mut output = Vec::new();
    serve("{oops\n".as_bytes(), &mut output, ctx_with_registry(&dir.path().join("none.json"))).unwrap();
    let reply: Value = serde_json::from_slice(&output).unwrap();
    assert_eq!((reply["id"].clone(), reply["error"]["code"].clone()), (Value::Null, json!(-32700)));
}

/// The window's RPC handlers read these fields without defaulting them (zod used to).
#[test]
fn arguments_are_defaulted_stripped_and_validated() {
    let stack_schema = super::tool_stack::tools().into_iter().find(|t| t.name == "set_review_stack").unwrap().input_schema;
    let mut args = json!({
        "title": "T",
        "unknown": 1,
        "cohorts": [{ "id": "c", "title": "C", "hunks": [{ "path": "a.ts", "startLine": 1, "endLine": 2 }] }],
        "blockers": [{ "id": "b", "title": "B", "findingId": null }],
    });
    normalize(&stack_schema, &mut args).unwrap();
    assert_eq!(args.get("unknown"), None);
    assert_eq!(args["summary"], "");
    assert_eq!(args["cohorts"][0]["hunks"][0]["side"], "after");
    assert_eq!(args["cohorts"][0]["moduleIds"], json!([]));
    assert_eq!(args["blockers"][0]["findingId"], Value::Null);

    let findings = super::tool_stack::tools().into_iter().find(|t| t.name == "upsert_findings").unwrap().input_schema;
    let mut bad = json!({ "findings": [{ "id": "f", "path": "a.ts", "startLine": 1, "endLine": 1, "severity": "huge", "title": "t", "body": "b" }] });
    assert!(normalize(&findings, &mut bad).unwrap_err().contains("arguments.findings[0].severity"));

    let impact = super::tool_context::tools().into_iter().find(|t| t.name == "analyze_diff_impact").unwrap().input_schema;
    let mut deep = json!({ "maxDepth": 9, "baseRef": null });
    assert!(normalize(&impact, &mut deep).unwrap_err().contains("<= 8"));
    assert_eq!(deep.get("baseRef"), None, "null on an optional, non-nullable field counts as absent");
}

fn echo_bridge(token: &str) -> u16 {
    let dispatch: DispatchFn = Arc::new(/*echoRequest*/ |req| {
        Ok(BridgeReply { result: Some(json!({ "method": req.method, "params": req.params })), error: None })
    });
    spawn_http_server(token.to_string(), dispatch).unwrap()
}

pub(super) fn write_registry(path: &Path, port: u16, token: &str) {
    let registry = json!({ "version": 1, "instances": [{ "pid": 1, "port": port, "token": token, "startedAtMs": 1 }] });
    std::fs::write(path, registry.to_string()).unwrap();
}

#[test]
fn forwards_normalized_calls_to_the_live_window() {
    let dir = tempfile::tempdir().unwrap();
    let registry = dir.path().join("instances.json");
    write_registry(&registry, echo_bridge("secret"), "secret");
    let replies = run(ctx_with_registry(&registry), &[call(
        1,
        "set_review_stack",
        json!({ "title": "T", "cohorts": [{ "id": "c", "title": "C" }] }),
    )]);
    let echoed = tool_json(&replies[0]);
    assert_eq!(echoed["method"], "set_review_stack");
    assert_eq!(echoed["params"]["blockers"], json!([]));
    assert_eq!(echoed["params"]["cohorts"][0]["hunks"], json!([]));
}

#[test]
fn a_wrong_token_surfaces_the_bridge_error() {
    let dir = tempfile::tempdir().unwrap();
    let registry = dir.path().join("instances.json");
    write_registry(&registry, echo_bridge("secret"), "stale");
    let replies = run(ctx_with_registry(&registry), &[call(1, "get_active_context", json!({}))]);
    assert_eq!(tool_error(&replies[0]), "unauthorized");
}

#[test]
fn headless_tools_answer_with_no_window_running() {
    let dir = tempfile::tempdir().unwrap();
    let project = dir.path().join("project");
    std::fs::create_dir_all(project.join(".codechart")).unwrap();
    let finding = json!({ "id": "f1", "path": "src/api.ts", "startLine": 10, "endLine": 12, "severity": "major", "title": "t", "body": "b", "status": "open" });
    let stacks = json!({ "version": 1, "stacks": [{ "diffId": "paste:test", "title": "Headless MR", "findings": [finding] }] });
    let notes = json!({ "version": 1, "notes": [{ "id": "n1", "path": "src/ui.ts", "startLine": 4, "endLine": 4, "body": "Copy?" }] });
    std::fs::write(project.join(".codechart/review-stacks.json"), stacks.to_string()).unwrap();
    std::fs::write(project.join(".codechart/review-notes.json"), notes.to_string()).unwrap();
    let diff = "--- a/src/core/todo.ts\n+++ b/src/core/todo.ts\n@@ -1 +1 @@\n-a\n+b\n";

    let replies = run(ctx_with_registry(&dir.path().join("no-gui.json")), &[
        call(1, "get_architecture_summary", json!({ "projectRoot": FIXTURE })),
        call(2, "analyze_diff_impact", json!({ "projectRoot": FIXTURE, "mode": "paste", "diffText": diff })),
        call(3, "export_review_comments", json!({ "format": "gitlab", "projectRoot": project })),
        call(4, "load_diff", json!({ "mode": "working-tree" })),
    ]);
    let summary = tool_json(&replies[0]);
    assert_eq!((summary["mode"].clone(), summary["moduleCount"].clone()), (json!("headless"), json!(13)));
    let impact = tool_json(&replies[1]);
    assert_eq!(impact["mode"], "headless");
    assert_eq!(impact["layers"][0]["moduleIds"], json!(["src/core/todo.ts"]));
    assert!(!impact["blastRadius"].as_array().unwrap().is_empty());
    let exported = tool_json(&replies[2]);
    assert_eq!(exported["discussions"].as_array().unwrap().len(), 2);
    assert_eq!(exported["missingShas"], true);
    assert!(tool_error(&replies[3]).contains("No running CodeChart desktop instance found"));
}
