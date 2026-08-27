use super::*;
use tempfile::tempdir;

fn note(path: &str, lines: &[&str]) -> ReviewNote {
    ReviewNote {
        id: "note-1".to_string(),
        path: path.to_string(),
        start_line: 1,
        end_line: lines.len(),
        anchor_lines: lines.iter().map(|line| line.to_string()).collect(),
        body: "remember this".to_string(),
    }
}

fn write(root: &Path, path: &str, text: &str) {
    let file = root.join(path);
    std::fs::create_dir_all(file.parent().unwrap()).unwrap();
    std::fs::write(file, text).unwrap();
}

fn save(root: &Path, note: ReviewNote) {
    save_review_notes(
        root.to_str().unwrap(),
        ReviewNotesDocument {
            version: 1,
            notes: vec![note],
        },
    )
    .unwrap();
}

#[test]
fn keeps_stationary_anchor_and_round_trips_atomically() {
    let root = tempdir().unwrap();
    write(root.path(), "src/a.ts", "one\ntwo\nthree\n");
    save(root.path(), note("src/a.ts", &["one", "two"]));
    let loaded =
        load_review_notes(root.path().to_str().unwrap(), vec!["src/a.ts".to_string()]).unwrap();
    assert_eq!(loaded.notes[0].start_line, 1);
    assert!(root.path().join(".codechart/review-notes.json").exists());
}

#[test]
fn moves_exact_and_normalized_same_file_anchors() {
    let root = tempdir().unwrap();
    write(root.path(), "src/a.ts", "before\nconst x = 1;\nreturn x;\n");
    save(
        root.path(),
        note("src/a.ts", &["const x = 1;", "return x;"]),
    );
    write(
        root.path(),
        "src/a.ts",
        "before\ninserted\nconst x = 1;\nreturn x;\n",
    );
    let exact =
        load_review_notes(root.path().to_str().unwrap(), vec!["src/a.ts".to_string()]).unwrap();
    assert_eq!(exact.notes[0].start_line, 3);
    write(
        root.path(),
        "src/a.ts",
        "before\ninserted\nconst   x=1;\nreturn   x ;\n",
    );
    let normalized =
        load_review_notes(root.path().to_str().unwrap(), vec!["src/a.ts".to_string()]).unwrap();
    assert_eq!(
        normalized.notes[0].anchor_lines,
        vec!["const   x=1;", "return   x ;"]
    );
}

#[test]
fn moves_renamed_file_but_drops_ambiguous_or_unsupported_existing_anchor() {
    let root = tempdir().unwrap();
    write(root.path(), "src/new.ts", "anchor\n");
    save(root.path(), note("src/old.ts", &["anchor"]));
    let moved = load_review_notes(
        root.path().to_str().unwrap(),
        vec!["src/new.ts".to_string()],
    )
    .unwrap();
    assert_eq!(moved.notes[0].path, "src/new.ts");
    save(root.path(), note("src/new.ts", &["anchor"]));
    let deleted = load_review_notes(
        root.path().to_str().unwrap(),
        vec!["src/other.ts".to_string()],
    )
    .unwrap();
    assert!(deleted.notes.is_empty());
    write(root.path(), "src/a.ts", "anchor\n");
    write(root.path(), "src/b.ts", "anchor\n");
    save(root.path(), note("src/gone.ts", &["anchor"]));
    let ambiguous = load_review_notes(
        root.path().to_str().unwrap(),
        vec!["src/a.ts".to_string(), "src/b.ts".to_string()],
    )
    .unwrap();
    assert!(ambiguous.notes.is_empty());
}

#[test]
fn preserves_malformed_file_and_rejects_unsafe_document() {
    let root = tempdir().unwrap();
    let file = root.path().join(".codechart/review-notes.json");
    std::fs::create_dir_all(file.parent().unwrap()).unwrap();
    std::fs::write(&file, b"not json").unwrap();
    assert!(load_review_notes(root.path().to_str().unwrap(), vec![]).is_err());
    assert_eq!(std::fs::read(&file).unwrap(), b"not json");
    let mut unsafe_note = note("../escape.ts", &["x"]);
    unsafe_note.start_line = 1;
    assert!(save_review_notes(
        root.path().to_str().unwrap(),
        ReviewNotesDocument {
            version: 1,
            notes: vec![unsafe_note]
        }
    )
    .is_err());
}

#[test]
fn reconciles_overlapping_notes_independently() {
    let root = tempdir().unwrap();
    write(root.path(), "src/a.ts", "a\nb\nc\n");
    let mut second = note("src/a.ts", &["b", "c"]);
    second.id = "note-2".to_string();
    second.start_line = 2;
    second.end_line = 3;
    save_review_notes(
        root.path().to_str().unwrap(),
        ReviewNotesDocument {
            version: 1,
            notes: vec![note("src/a.ts", &["a", "b"]), second],
        },
    )
    .unwrap();
    let loaded =
        load_review_notes(root.path().to_str().unwrap(), vec!["src/a.ts".to_string()]).unwrap();
    assert_eq!(loaded.notes.len(), 2);
}
