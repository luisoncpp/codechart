use super::registry::*;
use super::*;
use std::io::Cursor;
use tempfile::TempDir;

fn run_http(request: &str, auth: &str, dispatch: &DispatchFn) -> String {
    let mut reader = Cursor::new(request.as_bytes());
    let mut writer: Vec<u8> = Vec::new();
    handle_io(&mut reader, &mut writer, auth, dispatch);
    String::from_utf8(writer).unwrap()
}

#[test]
fn health_auth_and_rpc_roundtrip() {
    let dispatch: DispatchFn = Arc::new(|req| {
        Ok(BridgeReply {
            result: Some(json!({ "echo": req.method, "params": req.params })),
            error: None,
        })
    });
    let auth = "Bearer secret-token";

    let health = run_http("GET /health HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n", auth, &dispatch);
    assert!(health.starts_with("HTTP/1.1 200 OK"));
    assert!(health.contains("\"ok\":true"));

    let body = r#"{"id":"1","method":"ping","params":{"x":42}}"#;
    let unauth = run_http(
        &format!("POST /rpc HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Length: {}\r\n\r\n{}", body.len(), body),
        auth,
        &dispatch,
    );
    assert!(unauth.starts_with("HTTP/1.1 401 Unauthorized"));

    let ok = run_http(
        &format!(
            "POST /rpc HTTP/1.1\r\nHost: 127.0.0.1\r\nAuthorization: Bearer secret-token\r\nContent-Length: {}\r\n\r\n{}",
            body.len(),
            body
        ),
        auth,
        &dispatch,
    );
    assert!(ok.starts_with("HTTP/1.1 200 OK"));
    assert!(ok.contains("\"echo\":\"ping\""));
}

#[test]
fn registry_registers_and_unregisters_instances() {
    let dir = TempDir::new().unwrap();
    let path = dir.path().join("instances.json");
    register_instance(&path, InstanceEntry {
        pid: 1001,
        port: 45123,
        token: "abc".to_string(),
        started_at_ms: 1,
    })
    .unwrap();
    assert_eq!(read_registry(&path).instances.len(), 1);

    unregister_instance(&path, 1001, 45123).unwrap();
    assert!(read_registry(&path).instances.is_empty());
}
