// @Architecture(descriptionShort="MCP tools that drive the live canvas: cohort spotlight, blast radius badges, navigation")
use super::tools::{forward, object_schema, ToolDef};
use serde_json::json;

pub(crate) fn tools() -> Vec<ToolDef> {
    vec![focus_layer(), show_blast_radius(), navigate_to()]
}

fn focus_layer() -> ToolDef {
    ToolDef {
        name: "focus_layer",
        description: "Spotlight a cohort on the CodeChart canvas, band its line ranges in code, focus its first file, \
            and open its explanation frame.",
        input_schema: object_schema(
            json!({
                "cohortId": { "type": ["string", "null"], "description": "Cohort id to spotlight, or null to clear spotlight." },
                "spotlight": { "type": "string", "enum": ["dim-others", "highlight", "off"] },
                "openExplanation": {
                    "type": "boolean",
                    "description": "Open the cohort's explanation in a preview frame (default true).",
                },
            }),
            &["cohortId"],
        ),
        handler: forward,
    }
}

fn show_blast_radius() -> ToolDef {
    ToolDef {
        name: "show_blast_radius",
        description: "Compute and highlight downstream transitive dependents on the CodeChart canvas with hop-depth badges.",
        input_schema: object_schema(
            json!({
                "moduleId": { "type": "string", "description": "Seed module id (omit to use all changed diff modules)." },
                "maxDepth": { "type": "integer", "minimum": 1, "maximum": 8 },
            }),
            &[],
        ),
        handler: forward,
    }
}

fn navigate_to() -> ToolDef {
    ToolDef {
        name: "navigate_to",
        description: "Center the canvas on a module and optionally open its Preview Frame scrolled to a specific line.",
        input_schema: object_schema(
            json!({
                "path": { "type": "string" },
                "line": { "type": "integer", "minimum": 1 },
                "symbol": { "type": "string" },
                "openPreview": { "type": "boolean" },
            }),
            &["path"],
        ),
        handler: forward,
    }
}
