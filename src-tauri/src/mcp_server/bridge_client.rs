// @Architecture(descriptionShort="Finds the live CodeChart window in the instance registry and sends authenticated loopback RPC calls")
use crate::mcp_bridge::{read_registry, InstanceEntry};
use serde_json::{json, Value};
use std::io::{Read, Write};
use std::net::{SocketAddr, TcpStream};
use std::path::PathBuf;
use std::time::Duration;

const HEALTH_TIMEOUT: Duration = Duration::from_secs(1);
/// Longer than the window's own 30 s RPC timeout, so its error message wins.
const RPC_TIMEOUT: Duration = Duration::from_secs(40);

pub(crate) struct BridgeClient {
    registry_path: Option<PathBuf>,
    cached: Option<InstanceEntry>,
    next_id: u64,
}

impl BridgeClient {
    pub fn new(registry_path: Option<PathBuf>) -> Self {
        Self { registry_path, cached: None, next_id: 0 }
    }

    pub fn call(&mut self, method: &str, params: &Value) -> Result<Value, String> {
        let instance = self.resolve_instance()?;
        self.next_id += 1;
        let id = format!("mcp-{}-{}", std::process::id(), self.next_id);
        let body = json!({ "id": id, "method": method, "params": params }).to_string();
        let request = format!(
            "POST /rpc HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Type: application/json\r\nAuthorization: Bearer {}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
            instance.token,
            body.len()
        );
        let (status, payload) = exchange(instance.port, &request, RPC_TIMEOUT).map_err(|err| {
            self.cached = None;
            format!("Failed to reach CodeChart desktop bridge: {err}")
        })?;
        if status == 200 && payload["ok"].as_bool() == Some(true) {
            return Ok(payload.get("result").cloned().unwrap_or(Value::Null));
        }
        if status == 401 {
            self.cached = None;
        }
        Err(payload["error"].as_str().map_or_else(|| format!("Bridge HTTP {status}"), str::to_string))
    }

    /// Newest registered instance that answers `/health`; cached while it stays healthy.
    fn resolve_instance(&mut self) -> Result<InstanceEntry, String> {
        if let Some(cached) = self.cached.as_ref().filter(|c| is_healthy(c.port)) {
            return Ok(cached.clone());
        }
        self.cached = None;
        let path = self.registry_path.clone().filter(|p| p.exists()).ok_or_else(|| {
            let shown = self.registry_path.as_ref().map_or("instances.json".into(), |p| p.display().to_string());
            format!("No running CodeChart desktop instance found ({shown} missing). Open CodeChart first.")
        })?;
        let mut instances = read_registry(&path).instances;
        instances.sort_by(|a, b| b.started_at_ms.cmp(&a.started_at_ms));
        let live = instances.into_iter().find(|entry| is_healthy(entry.port)).ok_or_else(|| {
            "No live CodeChart desktop instance responded on loopback. Open CodeChart first.".to_string()
        })?;
        self.cached = Some(live.clone());
        Ok(live)
    }
}

fn is_healthy(port: u16) -> bool {
    let request = "GET /health HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n";
    matches!(exchange(port, request, HEALTH_TIMEOUT), Ok((200, _)))
}

/// One request on a fresh loopback connection; the bridge closes it after replying.
fn exchange(port: u16, request: &str, timeout: Duration) -> Result<(u16, Value), String> {
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    let mut stream = TcpStream::connect_timeout(&addr, timeout).map_err(|e| e.to_string())?;
    stream.set_read_timeout(Some(timeout)).map_err(|e| e.to_string())?;
    stream.write_all(request.as_bytes()).map_err(|e| e.to_string())?;
    let mut raw = Vec::new();
    stream.read_to_end(&mut raw).map_err(|e| e.to_string())?;
    parse_response(&raw)
}

fn parse_response(raw: &[u8]) -> Result<(u16, Value), String> {
    let text = String::from_utf8_lossy(raw);
    let (head, body) = text.split_once("\r\n\r\n").ok_or("malformed HTTP response")?;
    let status = head
        .split_whitespace()
        .nth(1)
        .and_then(|code| code.parse().ok())
        .ok_or("malformed HTTP status line")?;
    Ok((status, serde_json::from_str(body).unwrap_or(Value::Null)))
}
