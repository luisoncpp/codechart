// @Architecture(descriptionShort="Headless MCP fallbacks: in-process analysis and .codechart review files when no window answers")
use super::tools::str_arg;
use crate::cli::{analyze_fs, compute_impact, extract_diff_paths, ImpactArgs};
use crate::diff_impact::DEFAULT_BLAST_DEPTH;
use serde_json::{json, Value};
use std::path::Path;

/// `projectRoot` argument, else `CODECHART_PROJECT_ROOT`, as an absolute path.
pub(crate) fn fallback_root(arg: Option<&str>, env_root: Option<&str>) -> Option<String> {
    let raw = [arg, env_root].into_iter().flatten().map(str::trim).find(|s| !s.is_empty())?;
    let absolute = std::path::absolute(raw).map_or_else(|_| raw.to_string(), |p| p.to_string_lossy().into_owned());
    Some(absolute)
}

pub(crate) fn architecture_summary(root: &str, group_id: Option<&str>) -> Result<Value, String> {
    let graph = analyze_fs(root)?;
    let groups: Vec<Value> = graph
        .groups
        .iter()
        .filter_map(|group| serde_json::to_value(group).ok())
        .filter(|g| group_id.is_none_or(|id| g["id"] == id || g["parentId"] == id))
        .map(|g| summarize_group(&g))
        .collect();
    Ok(json!({
        "mode": "headless",
        "root": graph.root,
        "groups": groups,
        "moduleCount": graph.modules.len(),
        "edgeCount": graph.edges.len(),
        "diagnostics": graph.diagnostics,
    }))
}

fn summarize_group(group: &Value) -> Value {
    let tags = if group["tags"].is_array() { group["tags"].clone() } else { json!([]) };
    json!({
        "id": group["id"],
        "label": group["label"],
        "parentId": group["parentId"],
        "facadeModuleIds": group["facadeModuleIds"],
        "tags": tags,
        "descriptionShort": group["annotation"]["descriptionShort"],
    })
}

/// Paste mode keys on the diff's `+++` paths; otherwise refs (or the working tree against `baseRef`).
pub(crate) fn diff_impact(root: &str, args: &Value) -> Result<Value, String> {
    let max_depth = args["maxDepth"].as_u64().map_or(DEFAULT_BLAST_DEPTH, |depth| depth as usize);
    let mut parsed = ImpactArgs { path: root.to_string(), max_depth, ..Default::default() };
    if args["mode"] == "paste" {
        parsed.changed = extract_diff_paths(args["diffText"].as_str().unwrap_or_default());
        if parsed.changed.is_empty() {
            return Err("diffText names no changed files (no `+++` lines)".to_string());
        }
    } else {
        parsed.base = str_arg(args, "baseRef");
        parsed.head = str_arg(args, "headRef");
    }
    let mut report = serde_json::to_value(compute_impact(&parsed)?).map_err(|e| e.to_string())?;
    report["mode"] = json!("headless");
    Ok(report)
}

/// Review state read from `.codechart/`: the stack for `diff_id`, else the most recently saved one.
pub(crate) fn review_state(root: &str, diff_id: Option<&str>, include_resolved: bool) -> Result<Value, String> {
    let dir = Path::new(root).join(".codechart");
    let stacks = read_json(&dir.join("review-stacks.json"))?;
    let stack = stacks["stacks"]
        .as_array()
        .and_then(|all| match diff_id {
            Some(id) => all.iter().find(|s| s["diffId"] == id),
            None => all.last(),
        })
        .cloned()
        .unwrap_or(Value::Null);
    let active = stack["diffId"].as_str().or(diff_id).map(str::to_string);
    let findings: Vec<Value> = stack["findings"]
        .as_array()
        .into_iter()
        .flatten()
        .filter(|f| include_resolved || f["status"] == "open")
        .cloned()
        .collect();
    let notes = read_json(&dir.join("review-notes.json"))?;
    Ok(json!({
        "mode": "headless",
        "diffId": active,
        "title": stack["title"].as_str().unwrap_or("MR Review"),
        "summary": stack["summary"].as_str().unwrap_or_default(),
        "blockers": or_empty(&stack["blockers"]),
        "cohorts": or_empty(&stack["cohorts"]),
        "findings": findings,
        "reviewNotes": or_empty(&notes["notes"]),
        "reviewedPaths": reviewed_paths(&dir, active.as_deref())?,
        "unreviewedPaths": [],
    }))
}

fn reviewed_paths(dir: &Path, diff_id: Option<&str>) -> Result<Value, String> {
    let reviews = read_json(&dir.join("diff-reviews.json"))?;
    let entry = reviews["reviews"]
        .as_array()
        .and_then(|all| all.iter().find(|r| diff_id.is_some_and(|id| r["diffId"] == id)));
    Ok(entry.map_or(json!([]), |r| or_empty(&r["reviewedPaths"])))
}

fn or_empty(value: &Value) -> Value {
    if value.is_array() {
        value.clone()
    } else {
        json!([])
    }
}

/// Missing file → `null`; malformed file → error naming it.
fn read_json(path: &Path) -> Result<Value, String> {
    let Ok(raw) = std::fs::read_to_string(path) else {
        return Ok(Value::Null);
    };
    serde_json::from_str(&raw).map_err(|err| format!("{}: {err}", path.display()))
}
