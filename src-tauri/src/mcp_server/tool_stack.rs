// @Architecture(descriptionShort="MCP tools that load a diff and author the Review Stack: cohorts, blockers, findings, Diff Notes")
use super::tools::{forward, line_range_object, object_schema, ToolDef};
use serde_json::{json, Value};

pub(crate) fn tools() -> Vec<ToolDef> {
    vec![load_diff(), set_review_stack(), upsert_findings(), upsert_diff_notes(), clear_review_stack()]
}

fn load_diff() -> ToolDef {
    ToolDef {
        name: "load_diff",
        description: "Load a git commit diff, working-tree diff, or pasted unified diff onto the CodeChart canvas.",
        input_schema: object_schema(
            json!({
                "mode": { "type": "string", "enum": ["commits", "working-tree", "paste"] },
                "baseRef": { "type": "string" },
                "headRef": { "type": "string" },
                "diffText": { "type": "string" },
            }),
            &["mode"],
        ),
        handler: forward,
    }
}

fn set_review_stack() -> ToolDef {
    ToolDef {
        name: "set_review_stack",
        description: "Populate and persist the Change Stack drawer for the active diff: summary, merge blockers, and \
            cohorts. A cohort groups related changes (line-range hunks, possibly parts of several files) that are \
            best explained together.",
        input_schema: object_schema(
            json!({
                "title": { "type": "string" },
                "summary": { "type": "string", "default": "" },
                "cohorts": { "type": "array", "items": cohort_schema() },
                "blockers": { "type": "array", "items": blocker_schema(), "default": [] },
            }),
            &["title", "cohorts"],
        ),
        handler: forward,
    }
}

fn cohort_schema() -> Value {
    let strings = json!({ "type": "array", "items": { "type": "string" }, "default": [] });
    object_schema(
        json!({
            "id": { "type": "string" },
            "title": { "type": "string" },
            "rationale": { "type": "string", "default": "", "description": "1-3 line markdown summary shown in the drawer." },
            "explanation": { "type": "string", "default": "", "description": "Markdown walkthrough of the cohort, opened in its own preview frame." },
            "dependsOn": strings,
            "hunks": {
                "type": "array",
                "items": line_range_object(json!({}), &[]),
                "default": [],
                "description": "Line ranges in this cohort. A file may be split across cohorts.",
            },
            "moduleIds": {
                "type": "array",
                "items": { "type": "string" },
                "default": [],
                "description": "Files that belong to this cohort as a whole.",
            },
        }),
        &["id", "title"],
    )
}

fn blocker_schema() -> Value {
    object_schema(
        json!({
            "id": { "type": "string" },
            "title": { "type": "string" },
            "description": { "type": "string", "default": "" },
            "findingId": { "type": ["string", "null"] },
            "moduleId": { "type": ["string", "null"] },
        }),
        &["id", "title"],
    )
}

fn upsert_findings() -> ToolDef {
    let finding = line_range_object(
        json!({
            "id": { "type": "string" },
            "severity": { "type": "string", "enum": ["critical", "major", "minor", "trivial", "info"] },
            "category": { "type": "string", "default": "review" },
            "title": { "type": "string" },
            "body": { "type": "string" },
            "layerId": { "type": ["string", "null"] },
            "blocker": { "type": "boolean", "default": false },
            "suggestedFix": { "type": ["string", "null"] },
            "status": { "type": "string", "enum": ["open", "resolved", "dismissed"], "default": "open" },
        }),
        &["id", "severity", "title", "body"],
    );
    ToolDef {
        name: "upsert_findings",
        description: "Attach or update structured severity-badged findings anchored to file/line ranges (rendered \
            inline in CodeChart preview frames and the Findings tab).",
        input_schema: object_schema(json!({ "findings": { "type": "array", "items": finding } }), &["findings"]),
        handler: forward,
    }
}

fn upsert_diff_notes() -> ToolDef {
    let note = line_range_object(
        json!({
            "id": { "type": "string", "description": "Stable id; re-sending it updates the note." },
            "body": { "type": "string", "description": "Markdown explanation rendered under the range." },
        }),
        &["id", "body"],
    );
    ToolDef {
        name: "upsert_diff_notes",
        description: "Attach or update read-only markdown Diff Notes under changed lines: explain intent, \
            non-obvious decisions, invariants and cross-file connections. Not for issues (use findings).",
        input_schema: object_schema(json!({ "notes": { "type": "array", "items": note } }), &["notes"]),
        handler: forward,
    }
}

fn clear_review_stack() -> ToolDef {
    ToolDef {
        name: "clear_review_stack",
        description: "Clear the persisted Review Stack and findings for the active diff.",
        input_schema: object_schema(json!({}), &[]),
        handler: forward,
    }
}
