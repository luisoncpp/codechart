use super::*;
use tempfile::tempdir;

fn root_str(root: &tempfile::TempDir) -> &str {
    root.path().to_str().unwrap()
}

fn save(root: &tempfile::TempDir, diff_id: &str, paths: &[&str]) {
    let owned: Vec<String> = paths.iter().map(|path| path.to_string()).collect();
    save_diff_review(root_str(root), diff_id, owned).unwrap();
}

fn load(root: &tempfile::TempDir, diff_id: &str, paths: &[&str]) -> Vec<String> {
    let owned: Vec<String> = paths.iter().map(|path| path.to_string()).collect();
    load_diff_review(root_str(root), diff_id, owned).unwrap()
}

#[test]
fn round_trips_reviewed_paths_per_diff() {
    let root = tempdir().unwrap();
    save(&root, "commits:a..b", &["src/a.ts", "src/b.ts"]);
    save(&root, "working-tree:c", &["src/c.ts"]);
    assert_eq!(load(&root, "commits:a..b", &["src/a.ts", "src/b.ts"]), vec!["src/a.ts", "src/b.ts"]);
    assert_eq!(load(&root, "working-tree:c", &["src/c.ts"]), vec!["src/c.ts"]);
    assert!(root.path().join(".codechart/diff-reviews.json").exists());
}

#[test]
fn empty_save_removes_the_entry() {
    let root = tempdir().unwrap();
    save(&root, "commits:a..b", &["src/a.ts"]);
    save(&root, "commits:a..b", &[]);
    assert!(load(&root, "commits:a..b", &["src/a.ts"]).is_empty());
    let bytes = std::fs::read(root.path().join(".codechart/diff-reviews.json")).unwrap();
    let document: DiffReviewsDocument = serde_json::from_slice(&bytes).unwrap();
    assert!(document.reviews.is_empty());
}

#[test]
fn load_drops_paths_no_longer_in_the_diff_and_persists() {
    let root = tempdir().unwrap();
    save(&root, "working-tree:c", &["src/a.ts", "src/gone.ts"]);
    let reviewed = load(&root, "working-tree:c", &["src/a.ts"]);
    assert_eq!(reviewed, vec!["src/a.ts"]);
    let bytes = std::fs::read(root.path().join(".codechart/diff-reviews.json")).unwrap();
    let document: DiffReviewsDocument = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(document.reviews[0].reviewed_paths, vec!["src/a.ts"]);
}

#[test]
fn unknown_diff_loads_empty_without_creating_a_file() {
    let root = tempdir().unwrap();
    assert!(load(&root, "paste:1234", &["src/a.ts"]).is_empty());
}

#[test]
fn malformed_file_errors_unchanged() {
    let root = tempdir().unwrap();
    let file = root.path().join(".codechart/diff-reviews.json");
    std::fs::create_dir_all(file.parent().unwrap()).unwrap();
    std::fs::write(&file, "not json").unwrap();
    let error = load_diff_review(root_str(&root), "d", vec![]).unwrap_err();
    assert!(error.contains("malformed"), "unexpected error: {error}");
    assert_eq!(std::fs::read_to_string(&file).unwrap(), "not json");
}

#[test]
fn clear_wipes_every_persisted_entry() {
    let root = tempdir().unwrap();
    save(&root, "commits:a..b", &["src/a.ts"]);
    save(&root, "working-tree:c", &["src/c.ts"]);
    clear_diff_reviews(root_str(&root)).unwrap();
    assert!(load(&root, "commits:a..b", &["src/a.ts"]).is_empty());
    assert!(load(&root, "working-tree:c", &["src/c.ts"]).is_empty());
    let bytes = std::fs::read(root.path().join(".codechart/diff-reviews.json")).unwrap();
    let document: DiffReviewsDocument = serde_json::from_slice(&bytes).unwrap();
    assert!(document.reviews.is_empty());
}

#[test]
fn rejects_paths_escaping_the_project() {
    let root = tempdir().unwrap();
    let error = save_diff_review(root_str(&root), "d", vec!["../outside.ts".to_string()]).unwrap_err();
    assert!(error.contains("escapes"), "unexpected error: {error}");
    let error = save_diff_review(root_str(&root), "d", vec!["src\\win.ts".to_string()]).unwrap_err();
    assert!(error.contains("POSIX"), "unexpected error: {error}");
}
