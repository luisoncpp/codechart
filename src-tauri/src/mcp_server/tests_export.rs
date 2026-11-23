use super::diff_shas::{resolve_diff_shas, DiffShas, PartialShas};
use super::export::{format_review_export, ExportInput};
use serde_json::json;

const REPO_ROOT: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/..");

fn sample() -> ExportInput {
    let mut input: ExportInput = serde_json::from_value(json!({
        "diffId": "commits:a..b",
        "title": "Add invitations",
        "summary": "Adds invite flow.",
        "findings": [{
            "id": "f1", "path": "src/api.ts", "side": "after", "startLine": 10, "endLine": 12,
            "severity": "critical", "title": "Check expiry", "body": "Validate expiresAt.",
            "blocker": true, "suggestedFix": "if (expired) throw new Error();", "status": "open",
        }],
        "reviewNotes": [{ "id": "n1", "path": "src/ui.ts", "startLine": 4, "endLine": 4, "body": "Confirm empty state copy." }],
        "reviewedPaths": ["src/api.ts"],
        "unreviewedPaths": ["src/ui.ts"],
    }))
    .unwrap();
    input.include_review_notes = true;
    input
}

fn shas(warning: Option<&str>) -> DiffShas {
    DiffShas {
        base_sha: "b".repeat(40),
        start_sha: "s".repeat(40),
        head_sha: "h".repeat(40),
        warning: warning.map(str::to_string),
    }
}

#[test]
fn formats_markdown_github_and_gitlab_payloads() {
    let md = format_review_export("markdown", &sample())["markdown"].as_str().unwrap().to_string();
    assert!(md.starts_with("# Add invitations"));
    assert!(md.contains("1/2 files reviewed"));
    assert!(md.contains("- **[CRITICAL · BLOCKER]** `src/api.ts:10-12` — **Check expiry**"));
    assert!(md.contains("- `src/ui.ts:4` — Confirm empty state copy."));

    let gh = format_review_export("github", &sample());
    assert_eq!(gh["event"], "REQUEST_CHANGES");
    let comments = gh["comments"].as_array().unwrap();
    assert_eq!(comments.len(), 2);
    assert_eq!((comments[0]["line"].clone(), comments[0]["start_line"].clone()), (json!(12), json!(10)));
    assert_eq!(comments[0]["side"], "RIGHT");
    assert!(comments[0]["body"].as_str().unwrap().contains("```suggestion"));
    assert_eq!(comments[1].get("start_line"), None);

    let gl = format_review_export("gitlab", &sample());
    let discussions = gl["discussions"].as_array().unwrap();
    assert_eq!(discussions.len(), 2);
    assert_eq!(discussions[0]["position"]["new_path"], "src/api.ts");
    assert_eq!(discussions[0]["position"]["new_line"], 12);
    assert!(discussions[0]["body"].as_str().unwrap().contains("```suggestion:-0+0"));
}

#[test]
fn review_notes_can_be_left_out() {
    let mut input = sample();
    input.include_review_notes = false;
    assert_eq!(format_review_export("github", &input)["comments"].as_array().unwrap().len(), 1);
    assert!(!format_review_export("markdown", &input)["markdown"].as_str().unwrap().contains("Review Notes"));
}

#[test]
fn gitlab_positions_carry_known_shas_and_flag_missing_ones() {
    let mut input = sample();
    input.diff_shas = Some(shas(/*warning=*/ None));
    let gl = format_review_export("gitlab", &input);
    for discussion in gl["discussions"].as_array().unwrap() {
        assert_eq!(discussion["position"]["base_sha"], "b".repeat(40));
        assert_eq!(discussion["position"]["start_sha"], "s".repeat(40));
        assert_eq!(discussion["position"]["head_sha"], "h".repeat(40));
    }
    assert_eq!(gl.get("missingShas"), None);
    assert_eq!(gl.get("warning"), None);
    assert!(gl["discussions"][0]["body"].as_str().unwrap().contains("_(lines 10–12)_"));

    let missing = format_review_export("gitlab", &sample());
    assert_eq!(missing["missingShas"], true);
    assert_eq!(missing["warning"], "Fill position.base_sha/start_sha/head_sha before posting");
}

#[test]
fn resolves_gitlab_shas_from_commit_and_working_tree_diff_ids() {
    let none = PartialShas::default();
    let is_sha = |s: &str| s.len() == 40 && s.chars().all(|c| c.is_ascii_hexdigit());

    let commits = resolve_diff_shas(Some(REPO_ROOT), Some("commits:HEAD~1..HEAD"), &none).unwrap();
    assert!(is_sha(&commits.base_sha) && is_sha(&commits.start_sha) && is_sha(&commits.head_sha));
    assert_eq!(commits.warning, None);

    let working = resolve_diff_shas(Some(REPO_ROOT), Some("working-tree:HEAD"), &none).unwrap();
    assert_eq!(working.head_sha, working.base_sha);
    assert!(working.warning.unwrap().contains("uncommitted"));

    assert_eq!(resolve_diff_shas(Some(REPO_ROOT), Some("paste:abc"), &none), None);
    let given = PartialShas { base: Some("1".into()), start: Some("2".into()), head: Some("3".into()), warning: None };
    let provided = resolve_diff_shas(/*root=*/ None, Some("paste:abc"), &given).unwrap();
    assert_eq!((provided.base_sha, provided.start_sha, provided.head_sha), ("1".into(), "2".into(), "3".into()));
}
