// @Architecture(descriptionShort="Minimal loopback HTTP/1.1 parser and JSON responder for MCP bridge")
use std::collections::HashMap;
use std::io::{BufRead, BufReader, Read, Write};

const MAX_BODY_BYTES: usize = 8 * 1024 * 1024;

#[derive(Debug)]
pub struct HttpRequest {
    pub method: String,
    pub path: String,
    pub headers: HashMap<String, String>,
    pub body: Vec<u8>,
}

pub fn read_http_request<R: Read>(stream: &mut R) -> Result<HttpRequest, String> {
    let mut reader = BufReader::new(stream);
    let mut request_line = String::new();
    let n = reader.read_line(&mut request_line).map_err(|e| e.to_string())?;
    if n == 0 {
        return Err("empty request".to_string());
    }
    let parts: Vec<&str> = request_line.split_whitespace().collect();
    if parts.len() < 2 {
        return Err("malformed request line".to_string());
    }
    let headers = read_headers(&mut reader)?;
    let content_len = headers
        .get("content-length")
        .and_then(|v| v.parse::<usize>().ok())
        .unwrap_or(0);
    if content_len > MAX_BODY_BYTES {
        return Err("request body too large".to_string());
    }
    let mut body = vec![0u8; content_len];
    if content_len > 0 {
        reader.read_exact(&mut body).map_err(|e| e.to_string())?;
    }
    Ok(HttpRequest {
        method: parts[0].to_string(),
        path: parts[1].to_string(),
        headers,
        body,
    })
}

fn read_headers<R: Read>(reader: &mut BufReader<&mut R>) -> Result<HashMap<String, String>, String> {
    let mut headers = HashMap::new();
    loop {
        let mut line = String::new();
        reader.read_line(&mut line).map_err(|e| e.to_string())?;
        let trimmed = line.trim_end_matches(['\r', '\n']);
        if trimmed.is_empty() {
            break;
        }
        if let Some((name, value)) = trimmed.split_once(':') {
            headers.insert(name.trim().to_ascii_lowercase(), value.trim().to_string());
        }
    }
    Ok(headers)
}

pub fn write_json_response<W: Write>(stream: &mut W, status: u16, body: &serde_json::Value) {
    let reason = match status {
        200 => "OK",
        400 => "Bad Request",
        401 => "Unauthorized",
        404 => "Not Found",
        504 => "Gateway Timeout",
        _ => "Internal Server Error",
    };
    let payload = serde_json::to_vec(body).unwrap_or_else(|_| b"{}".to_vec());
    let header = format!(
        "HTTP/1.1 {status} {reason}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
        payload.len()
    );
    let _ = stream.write_all(header.as_bytes());
    let _ = stream.write_all(&payload);
    let _ = stream.flush();
}
