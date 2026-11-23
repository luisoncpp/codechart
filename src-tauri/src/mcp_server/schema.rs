// @Architecture(descriptionShort="Applies JSON Schema defaults and validates MCP tool arguments before forwarding")
use serde_json::{Map, Value};

/// Fill `default`s, drop unknown keys and stray `null`s, and check required / type / enum / bounds.
/// The window's RPC handlers rely on these defaults (zod applied them in the old Node server).
pub(crate) fn normalize(schema: &Value, value: &mut Value) -> Result<(), String> {
    normalize_at(schema, value, "arguments")
}

fn normalize_at(schema: &Value, value: &mut Value, at: &str) -> Result<(), String> {
    if value.is_null() && allows(schema, "null") {
        return Ok(());
    }
    match primary_type(schema) {
        "object" => normalize_object(schema, value, at),
        "array" => normalize_array(schema, value, at),
        _ => check_scalar(schema, value, at),
    }
}

fn normalize_object(schema: &Value, value: &mut Value, at: &str) -> Result<(), String> {
    let Some(obj) = value.as_object_mut() else {
        return Err(format!("`{at}` must be an object"));
    };
    let empty = Map::new();
    let props = schema["properties"].as_object().unwrap_or(&empty);
    obj.retain(|key, v| props.get(key).is_some_and(|prop| !v.is_null() || allows(prop, "null")));
    for (key, prop) in props {
        if let (false, Some(default)) = (obj.contains_key(key), prop.get("default")) {
            obj.insert(key.clone(), default.clone());
        }
    }
    for required in schema["required"].as_array().into_iter().flatten().filter_map(Value::as_str) {
        if !obj.contains_key(required) {
            return Err(format!("Missing required argument `{at}.{required}`"));
        }
    }
    for (key, prop) in props {
        if let Some(child) = obj.get_mut(key) {
            normalize_at(prop, child, &format!("{at}.{key}"))?;
        }
    }
    Ok(())
}

fn normalize_array(schema: &Value, value: &mut Value, at: &str) -> Result<(), String> {
    let Some(items) = value.as_array_mut() else {
        return Err(format!("`{at}` must be an array"));
    };
    for (index, item) in items.iter_mut().enumerate() {
        normalize_at(&schema["items"], item, &format!("{at}[{index}]"))?;
    }
    Ok(())
}

fn check_scalar(schema: &Value, value: &Value, at: &str) -> Result<(), String> {
    let kind = primary_type(schema);
    let matches = match kind {
        "string" => value.is_string(),
        "boolean" => value.is_boolean(),
        "integer" => value.as_f64().is_some_and(|n| n.fract() == 0.0),
        "number" => value.is_number(),
        _ => true,
    };
    if !matches {
        return Err(format!("`{at}` must be a {kind}"));
    }
    if let Some(options) = schema["enum"].as_array().filter(|o| !o.contains(value)) {
        return Err(format!("`{at}` must be one of {}", Value::Array(options.clone())));
    }
    check_bounds(schema, value, at)
}

fn check_bounds(schema: &Value, value: &Value, at: &str) -> Result<(), String> {
    let Some(n) = value.as_f64() else {
        return Ok(());
    };
    if let Some(min) = schema["minimum"].as_f64().filter(|min| n < *min) {
        return Err(format!("`{at}` must be >= {min}"));
    }
    if let Some(max) = schema["maximum"].as_f64().filter(|max| n > *max) {
        return Err(format!("`{at}` must be <= {max}"));
    }
    Ok(())
}

/// First non-`null` entry of `type` (a string or an array such as `["string", "null"]`).
fn primary_type(schema: &Value) -> &str {
    match &schema["type"] {
        Value::String(kind) => kind,
        Value::Array(kinds) => kinds.iter().filter_map(Value::as_str).find(|k| *k != "null").unwrap_or("null"),
        _ => "",
    }
}

fn allows(schema: &Value, kind: &str) -> bool {
    match &schema["type"] {
        Value::String(k) => k == kind,
        Value::Array(kinds) => kinds.iter().any(|k| k == kind),
        _ => true,
    }
}
