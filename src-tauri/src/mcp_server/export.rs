// @Architecture(descriptionShort="Pure formatters exporting findings and Review Notes for Markdown, GitHub, and GitLab")
use super::diff_shas::DiffShas;
use serde::Deserialize;
use serde_json::{json, Value};

const MISSING_SHAS_WARNING: &str = "Fill position.base_sha/start_sha/head_sha before posting";

/// A finding or a Review Note; notes leave the finding-only fields at their defaults.
#[derive(Debug, Default, Clone, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub(crate) struct ExportItem {
    pub path: String,
    pub side: Option<String>,
    pub start_line: u64,
    pub end_line: u64,
    pub severity: String,
    pub title: String,
    pub body: String,
    pub blocker: bool,
    pub suggested_fix: Option<String>,
}

/// Deserialized from a review state (live `get_review_state` or headless); the rest is set by the caller.
#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub(crate) struct ExportInput {
    pub diff_id: Option<String>,
    pub title: Option<String>,
    pub summary: Option<String>,
    pub findings: Vec<ExportItem>,
    pub review_notes: Vec<ExportItem>,
    pub reviewed_paths: Vec<String>,
    pub unreviewed_paths: Vec<String>,
    #[serde(skip)]
    pub include_review_notes: bool,
    /// GitLab `position` SHAs; `None` → payload is flagged `missingShas`.
    #[serde(skip)]
    pub diff_shas: Option<DiffShas>,
}

pub(crate) fn format_review_export(format: &str, input: &ExportInput) -> Value {
    match format {
        "github" => format_github(input),
        "gitlab" => format_gitlab(input),
        _ => json!({ "format": "markdown", "markdown": format_markdown(input) }),
    }
}

fn format_markdown(input: &ExportInput) -> String {
    let mut lines = vec![format!("# {}", non_empty(&input.title).unwrap_or("CodeChart MR Review"))];
    if let Some(summary) = non_empty(&input.summary) {
        lines.extend([String::new(), summary.to_string()]);
    }
    let total = input.reviewed_paths.len() + input.unreviewed_paths.len();
    if total > 0 {
        let reviewed = input.reviewed_paths.len();
        lines.extend([String::new(), format!("**Review progress:** {reviewed}/{total} files reviewed")]);
    }
    if !input.findings.is_empty() {
        lines.extend([String::new(), "## Findings".to_string()]);
        input.findings.iter().for_each(|f| push_markdown_finding(&mut lines, f));
    }
    if input.include_review_notes && !input.review_notes.is_empty() {
        lines.extend([String::new(), "## Review Notes".to_string()]);
        for note in &input.review_notes {
            lines.push(format!("- `{}:{}` — {}", note.path, range_label(note), note.body));
        }
    }
    lines.join("\n")
}

fn push_markdown_finding(lines: &mut Vec<String>, f: &ExportItem) {
    let severity = f.severity.to_uppercase();
    let tag = if f.blocker { format!("**[{severity} · BLOCKER]**") } else { format!("**[{severity}]**") };
    lines.push(format!("- {tag} `{}:{}` — **{}**", f.path, range_label(f), f.title));
    lines.push(format!("  {}", f.body));
    if let Some(fix) = non_empty(&f.suggested_fix) {
        lines.extend(["  ```suggestion".to_string(), format!("  {fix}"), "  ```".to_string()]);
    }
}

fn format_github(input: &ExportInput) -> Value {
    let has_blocker = input.findings.iter().any(|f| f.blocker || f.severity == "critical");
    let mut comments: Vec<Value> = input.findings.iter().map(github_finding).collect();
    if input.include_review_notes {
        comments.extend(input.review_notes.iter().map(|n| github_comment(n, "RIGHT", n.body.clone())));
    }
    let count = comments.len();
    let plural = if count == 1 { "" } else { "s" };
    let body = non_empty(&input.summary)
        .map_or_else(|| format!("CodeChart review ({count} inline comment{plural})."), str::to_string);
    let event = if has_blocker { "REQUEST_CHANGES" } else { "COMMENT" };
    json!({ "format": "github", "event": event, "body": body, "comments": comments })
}

fn github_finding(f: &ExportItem) -> Value {
    let mut body = vec![format!("**[{}] {}**", f.severity.to_uppercase(), f.title), String::new(), f.body.clone()];
    if let Some(fix) = non_empty(&f.suggested_fix) {
        body.extend([String::new(), "```suggestion".to_string(), fix.to_string(), "```".to_string()]);
    }
    let side = if f.side.as_deref() == Some("before") { "LEFT" } else { "RIGHT" };
    github_comment(f, side, body.join("\n"))
}

fn github_comment(item: &ExportItem, side: &str, body: String) -> Value {
    let mut comment = json!({ "path": item.path, "line": item.end_line, "side": side, "body": body });
    if item.start_line != item.end_line {
        comment["start_line"] = json!(item.start_line);
    }
    comment
}

fn format_gitlab(input: &ExportInput) -> Value {
    let shas = input.diff_shas.as_ref();
    let mut discussions: Vec<Value> = input
        .findings
        .iter()
        .map(|f| json!({ "body": gitlab_finding_body(f), "position": gitlab_position(f, shas) }))
        .collect();
    if input.include_review_notes {
        discussions.extend(input.review_notes.iter().map(|n| {
            json!({ "body": format!("{}{}", n.body, range_suffix(n)), "position": gitlab_position(n, shas) })
        }));
    }
    let mut out = json!({ "format": "gitlab", "summaryNote": format_markdown(input), "discussions": discussions });
    match shas {
        None => {
            out["missingShas"] = json!(true);
            out["warning"] = json!(MISSING_SHAS_WARNING);
        }
        Some(DiffShas { warning: Some(warning), .. }) => out["warning"] = json!(warning),
        Some(_) => {}
    }
    out
}

fn gitlab_finding_body(f: &ExportItem) -> String {
    let heading = format!("**[{}] {}**{}", f.severity.to_uppercase(), f.title, range_suffix(f));
    let mut parts = vec![heading, String::new(), f.body.clone()];
    if let Some(fix) = non_empty(&f.suggested_fix) {
        parts.extend([String::new(), "```suggestion:-0+0".to_string(), fix.to_string(), "```".to_string()]);
    }
    parts.join("\n")
}

/// Single-line anchor at `endLine`; GitLab `line_range` needs per-line `line_code`s we can't derive.
fn gitlab_position(item: &ExportItem, shas: Option<&DiffShas>) -> Value {
    let mut position = json!({ "position_type": "text", "old_path": item.path, "new_path": item.path });
    if let Some(shas) = shas {
        position["base_sha"] = json!(shas.base_sha);
        position["start_sha"] = json!(shas.start_sha);
        position["head_sha"] = json!(shas.head_sha);
    }
    let line_key = if item.side.as_deref() == Some("before") { "old_line" } else { "new_line" };
    position[line_key] = json!(item.end_line);
    position
}

/// Multi-line ranges keep their extent visible in the body instead of silently collapsing.
fn range_suffix(item: &ExportItem) -> String {
    if item.start_line == item.end_line {
        return String::new();
    }
    format!(" _(lines {}–{})_", item.start_line, item.end_line)
}

fn range_label(item: &ExportItem) -> String {
    if item.start_line == item.end_line {
        return item.start_line.to_string();
    }
    format!("{}-{}", item.start_line, item.end_line)
}

fn non_empty(value: &Option<String>) -> Option<&str> {
    value.as_deref().filter(|s| !s.is_empty())
}
