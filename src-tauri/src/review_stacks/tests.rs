use super::*;
use tempfile::TempDir;

fn sample_stack(diff_id: &str) -> ReviewStackRecord {
    ReviewStackRecord {
        diff_id: diff_id.to_string(),
        title: "Add teammate invitations".to_string(),
        summary: "Adds invitation model, API, and UI.".to_string(),
        cohorts: vec![ReviewCohort {
            id: "c1".to_string(),
            title: "Data model".to_string(),
            rationale: "Foundation layer".to_string(),
            depends_on: vec![],
            module_ids: vec!["src/model/invite.ts".to_string()],
            explanation: "## Why
Invites need an owner.".to_string(),
            hunks: vec![CohortHunk {
                path: "src/model/invite.ts".to_string(),
                side: FindingSide::After,
                start_line: 1,
                end_line: 20,
            }],
        }],
        blockers: vec![ReviewBlocker {
            id: "b1".to_string(),
            title: "Missing expiry check".to_string(),
            description: "Check expiresAt before accepting".to_string(),
            finding_id: Some("f1".to_string()),
            module_id: Some("src/model/invite.ts".to_string()),
        }],
        findings: vec![ReviewFinding {
            id: "f1".to_string(),
            path: "src/model/invite.ts".to_string(),
            side: FindingSide::After,
            start_line: 10,
            end_line: 14,
            severity: FindingSeverity::Critical,
            category: "security".to_string(),
            title: "Expiry not enforced".to_string(),
            body: "Expired invites can still be accepted.".to_string(),
            layer_id: Some("c1".to_string()),
            blocker: true,
            suggested_fix: Some("if (invite.expiresAt < Date.now()) throw ...".to_string()),
            status: FindingStatus::Open,
        }],
        diff_notes: vec![AgentDiffNote {
            id: "n1".to_string(),
            path: "src/model/invite.ts".to_string(),
            side: FindingSide::After,
            start_line: 3,
            end_line: 5,
            body: "Explains the **owner** field.".to_string(),
        }],
    }
}

#[test]
fn saves_loads_deletes_and_clears_review_stacks() {
    let dir = TempDir::new().unwrap();
    let root = dir.path().to_str().unwrap();

    assert_eq!(load_review_stack(root, "commits:a..b").unwrap(), None);

    let stack = sample_stack("commits:a..b");
    save_review_stack(root, stack.clone()).unwrap();
    assert_eq!(load_review_stack(root, "commits:a..b").unwrap(), Some(stack));

    delete_review_stack(root, "commits:a..b").unwrap();
    assert_eq!(load_review_stack(root, "commits:a..b").unwrap(), None);

    save_review_stack(root, sample_stack("paste:123")).unwrap();
    clear_review_stacks(root).unwrap();
    assert_eq!(load_review_stack(root, "paste:123").unwrap(), None);
}

#[test]
fn rejects_escaping_paths_and_invalid_line_ranges() {
    let dir = TempDir::new().unwrap();
    let root = dir.path().to_str().unwrap();

    let mut bad_path = sample_stack("commits:a..b");
    bad_path.cohorts[0].module_ids = vec!["../secret.ts".to_string()];
    assert!(save_review_stack(root, bad_path).is_err());

    let mut bad_lines = sample_stack("commits:a..b");
    bad_lines.findings[0].start_line = 20;
    bad_lines.findings[0].end_line = 10;
    assert!(save_review_stack(root, bad_lines).is_err());
}

#[test]
fn rejects_bad_hunk_and_diff_note_anchors() {
    let dir = TempDir::new().unwrap();
    let root = dir.path().to_str().unwrap();

    let mut bad_hunk = sample_stack("commits:a..b");
    bad_hunk.cohorts[0].hunks[0].path = "/abs/invite.ts".to_string();
    assert!(save_review_stack(root, bad_hunk).is_err());

    let mut bad_note_lines = sample_stack("commits:a..b");
    bad_note_lines.diff_notes[0].start_line = 0;
    assert!(save_review_stack(root, bad_note_lines).is_err());

    let mut blank_note_id = sample_stack("commits:a..b");
    blank_note_id.diff_notes[0].id = " ".to_string();
    assert!(save_review_stack(root, blank_note_id).is_err());
}

#[test]
fn loads_documents_written_before_hunks_and_diff_notes_existed() {
    let dir = TempDir::new().unwrap();
    let root = dir.path().to_str().unwrap();
    let legacy = r#"{"version":1,"stacks":[{"diffId":"paste:1","title":"T",
        "cohorts":[{"id":"c1","title":"C","moduleIds":["src/a.ts"]}]}]}"#;
    std::fs::create_dir_all(dir.path().join(".codechart")).unwrap();
    std::fs::write(dir.path().join(".codechart/review-stacks.json"), legacy).unwrap();

    let stack = load_review_stack(root, "paste:1").unwrap().unwrap();
    assert!(stack.diff_notes.is_empty());
    assert!(stack.cohorts[0].hunks.is_empty());
    assert_eq!(stack.cohorts[0].explanation, "");
}
