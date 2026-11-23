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
