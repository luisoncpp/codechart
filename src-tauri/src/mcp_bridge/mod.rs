// @Architecture(descriptionShort="Loopback MCP bridge state, HTTP server loop, and Tauri event relay")
mod http;
pub mod registry;

use http::{read_http_request, write_json_response};
use registry::{default_registry_path, generate_token, now_ms, register_instance, unregister_instance, InstanceEntry};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::net::{TcpListener, TcpStream};
use std::sync::{mpsc, Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter};

pub const BRIDGE_EVENT_NAME: &str = "mcp-bridge-request";
const RPC_TIMEOUT_SECS: u64 = 30;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeRpcRequest {
    pub id: String,
    pub method: String,
    #[serde(default)]
    pub params: Value,
}

#[derive(Debug, Clone)]
pub struct BridgeReply {
    pub result: Option<Value>,
    pub error: Option<String>,
}

pub type DispatchFn = Arc<dyn Fn(BridgeRpcRequest) -> Result<BridgeReply, String> + Send + Sync>;

pub struct McpBridgeState {
    pending: Mutex<HashMap<String, mpsc::Sender<BridgeReply>>>,
    port: Mutex<Option<u16>>,
}

impl Default for McpBridgeState {
    fn default() -> Self {
        Self::new()
    }
}

impl McpBridgeState {
    pub fn new() -> Self {
        Self { pending: Mutex::new(HashMap::new()), port: Mutex::new(None) }
    }

    pub fn resolve(&self, id: &str, result: Option<Value>, error: Option<String>) -> bool {
        let sender = self.pending.lock().ok().and_then(|mut map| map.remove(id));
        match sender {
            Some(tx) => tx.send(BridgeReply { result, error }).is_ok(),
            None => false,
        }
    }

    pub fn dispatch_to_webview(
        self: &Arc<Self>,
        app: &AppHandle,
        req: BridgeRpcRequest,
    ) -> Result<BridgeReply, String> {
        let (tx, rx) = mpsc::channel();
        {
            let mut map = self.pending.lock().map_err(|_| "bridge lock poisoned".to_string())?;
            map.insert(req.id.clone(), tx);
        }
        if let Err(err) = app.emit(BRIDGE_EVENT_NAME, &req) {
            if let Ok(mut map) = self.pending.lock() {
                map.remove(&req.id);
            }
            return Err(format!("failed to emit bridge event: {err}"));
        }
        match rx.recv_timeout(Duration::from_secs(RPC_TIMEOUT_SECS)) {
            Ok(reply) => Ok(reply),
            Err(_) => {
                if let Ok(mut map) = self.pending.lock() {
                    map.remove(&req.id);
                }
                Err("CodeChart window timed out handling MCP request".to_string())
            }
        }
    }

    pub fn cleanup_registry(&self) {
        let port = self.port.lock().ok().and_then(|g| *g);
        if let (Some(port), Some(path)) = (port, default_registry_path()) {
            let _ = unregister_instance(&path, std::process::id(), port);
        }
    }
}

pub fn start_tauri_bridge(app: AppHandle, state: Arc<McpBridgeState>) -> Result<u16, String> {
    let token = generate_token();
    let state_for_dispatch = Arc::clone(&state);
    let dispatch: DispatchFn = Arc::new(move |req| state_for_dispatch.dispatch_to_webview(&app, req));
    let port = spawn_http_server(token.clone(), dispatch)?;
    if let Ok(mut guard) = state.port.lock() {
        *guard = Some(port);
    }
    if let Some(path) = default_registry_path() {
        let _ = register_instance(&path, InstanceEntry {
            pid: std::process::id(),
            port,
            token,
            started_at_ms: now_ms(),
        });
    }
    Ok(port)
}

pub fn spawn_http_server(token: String, dispatch: DispatchFn) -> Result<u16, String> {
    let listener = TcpListener::bind("127.0.0.1:0").map_err(|e| e.to_string())?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    let expected_auth = format!("Bearer {token}");
    std::thread::spawn(move || {
        for stream in listener.incoming().flatten() {
            let auth = expected_auth.clone();
            let handler = Arc::clone(&dispatch);
            std::thread::spawn(move || handle_connection(stream, &auth, &handler));
        }
    });
    Ok(port)
}

fn handle_connection(mut stream: TcpStream, expected_auth: &str, dispatch: &DispatchFn) {
    let _ = stream.set_read_timeout(Some(Duration::from_secs(5)));
    let Ok(mut writer) = stream.try_clone() else {
        return;
    };
    handle_io(&mut stream, &mut writer, expected_auth, dispatch);
}

pub(crate) fn handle_io<R: std::io::Read, W: std::io::Write>(
    reader: &mut R,
    writer: &mut W,
    expected_auth: &str,
    dispatch: &DispatchFn,
) {
    let Ok(req) = read_http_request(reader) else {
        write_json_response(writer, 400, &json!({ "ok": false, "error": "bad request" }));
        return;
    };
    if req.method == "GET" && req.path == "/health" {
        write_json_response(writer, 200, &json!({ "ok": true, "pid": std::process::id() }));
        return;
    }
    if req.method != "POST" || req.path != "/rpc" {
        write_json_response(writer, 404, &json!({ "ok": false, "error": "not found" }));
        return;
    }
    let auth = req.headers.get("authorization").map(String::as_str).unwrap_or("");
    if auth != expected_auth {
        write_json_response(writer, 401, &json!({ "ok": false, "error": "unauthorized" }));
        return;
    }
    handle_rpc(writer, &req.body, dispatch);
}

fn handle_rpc<W: std::io::Write>(stream: &mut W, body: &[u8], dispatch: &DispatchFn) {
    let Ok(rpc) = serde_json::from_slice::<BridgeRpcRequest>(body) else {
        write_json_response(stream, 400, &json!({ "ok": false, "error": "invalid rpc payload" }));
        return;
    };
    match dispatch(rpc) {
        Ok(BridgeReply { error: Some(err), .. }) => {
            write_json_response(stream, 200, &json!({ "ok": false, "error": err }));
        }
        Ok(BridgeReply { result, error: None }) => {
            write_json_response(stream, 200, &json!({ "ok": true, "result": result.unwrap_or(Value::Null) }));
        }
        Err(err) => {
            write_json_response(stream, 504, &json!({ "ok": false, "error": err }));
        }
    }
}

#[cfg(test)]
mod tests;
