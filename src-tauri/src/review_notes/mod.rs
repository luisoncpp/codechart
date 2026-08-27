use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::path::{Component, Path, PathBuf};
use tempfile::NamedTempFile;

const NOTES_DIR: &str = ".codechart";
const NOTES_FILE: &str = "review-notes.json";
const VERSION: u32 = 1;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewNote {
    pub id: String,
    pub path: String,
    pub start_line: usize,
    pub end_line: usize,
    pub anchor_lines: Vec<String>,
    pub body: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewNotesDocument {
    pub version: u32,
    pub notes: Vec<ReviewNote>,
}

impl ReviewNotesDocument {
    fn empty() -> Self {
        Self {
            version: VERSION,
            notes: Vec::new(),
        }
    }
}

pub fn load_review_notes(
    root: &str,
    module_paths: Vec<String>,
) -> Result<ReviewNotesDocument, String> {
    let file = notes_path(root);
    if !file.exists() {
        return Ok(ReviewNotesDocument::empty());
    }
    let bytes = std::fs::read(&file).map_err(display_error)?;
    let document: ReviewNotesDocument = serde_json::from_slice(&bytes)
        .map_err(|error| format!("review notes file is malformed: {error}"))?;
    validate_document(&document)?;
    let supported = module_paths.into_iter().collect::<HashSet<_>>();
    let reconciled = reconcile(document.clone(), root, &supported)?;
    if reconciled != document {
        write_document(root, &reconciled)?;
    }
    Ok(reconciled)
}

pub fn save_review_notes(root: &str, document: ReviewNotesDocument) -> Result<(), String> {
    validate_document(&document)?;
    write_document(root, &document)
}

fn reconcile(
    mut document: ReviewNotesDocument,
    root: &str,
    supported: &HashSet<String>,
) -> Result<ReviewNotesDocument, String> {
    let mut kept = Vec::new();
    for mut note in document.notes {
        let original_exists = project_file(root, &note.path).exists();
        if original_exists && !supported.contains(&note.path) {
            continue;
        }
        let candidates: Vec<String> = if original_exists {
            vec![note.path.clone()]
        } else {
            supported.iter().cloned().collect()
        };
        if let Some((path, start, lines)) = find_anchor(root, &note, &candidates)? {
            note.path = path;
            note.start_line = start + 1;
            note.end_line = start + lines.len();
            note.anchor_lines = lines;
            kept.push(note);
        }
    }
    document.notes = kept;
    Ok(document)
}

fn find_anchor(
    root: &str,
    note: &ReviewNote,
    paths: &[String],
) -> Result<Option<(String, usize, Vec<String>)>, String> {
    if paths.len() == 1 {
        let lines = read_lines(root, &paths[0])?;
        let start = note.start_line.saturating_sub(1);
        if block_at(&lines, start, &note.anchor_lines) {
            return Ok(Some((paths[0].clone(), start, note.anchor_lines.clone())));
        }
    }
    let exact = matches_for(root, paths, &note.anchor_lines, /*normalized=*/ false)?;
    if exact.len() == 1 {
        return Ok(exact.into_iter().next());
    }
    let normalized = matches_for(root, paths, &note.anchor_lines, /*normalized=*/ true)?;
    Ok(if normalized.len() == 1 {
        normalized.into_iter().next()
    } else {
        None
    })
}

fn matches_for(
    root: &str,
    paths: &[String],
    anchor: &[String],
    normalized: bool,
) -> Result<Vec<(String, usize, Vec<String>)>, String> {
    let mut matches = Vec::new();
    for path in paths {
        let lines = read_lines(root, path)?;
        if lines.len() < anchor.len() {
            continue;
        }
        for start in 0..=lines.len() - anchor.len() {
            let actual = &lines[start..start + anchor.len()];
            let equal = if normalized {
                actual
                    .iter()
                    .map(normalize)
                    .eq(anchor.iter().map(normalize))
            } else {
                actual == anchor
            };
            if equal {
                matches.push((path.clone(), start, actual.to_vec()));
            }
        }
    }
    Ok(matches)
}

fn normalize(line: &String) -> String {
    line.chars()
        .filter(|character| !character.is_whitespace())
        .collect()
}

fn block_at(lines: &[String], start: usize, anchor: &[String]) -> bool {
    lines.get(start..start + anchor.len()) == Some(anchor)
}

fn read_lines(root: &str, path: &str) -> Result<Vec<String>, String> {
    Ok(std::fs::read_to_string(project_file(root, path))
        .map_err(display_error)?
        .split('\n')
        .map(|line| line.strip_suffix('\r').unwrap_or(line).to_string())
        .collect())
}

fn validate_document(document: &ReviewNotesDocument) -> Result<(), String> {
    if document.version != VERSION {
        return Err(format!(
            "unsupported review notes version: {}",
            document.version
        ));
    }
    let mut ids = HashSet::new();
    for note in &document.notes {
        if note.id.trim().is_empty() || !ids.insert(&note.id) {
            return Err("review note ids must be unique and nonblank".to_string());
        }
        if note.body.trim().is_empty() {
            return Err("review note body cannot be blank".to_string());
        }
        if note.start_line == 0 || note.end_line < note.start_line {
            return Err("review note line range is invalid".to_string());
        }
        if note.anchor_lines.len() != note.end_line - note.start_line + 1 {
            return Err("review note anchor length does not match its range".to_string());
        }
        validate_relative_path(&note.path)?;
    }
    Ok(())
}

fn validate_relative_path(path: &str) -> Result<(), String> {
    if path.is_empty() || path.contains('\\') {
        return Err("review note path must be a relative POSIX path".to_string());
    }
    let candidate = Path::new(path);
    if candidate.is_absolute()
        || candidate.components().any(|part| {
            matches!(
                part,
                Component::ParentDir | Component::RootDir | Component::Prefix(_)
            )
        })
    {
        return Err("review note path escapes the project".to_string());
    }
    if path.split('/').any(|part| part.is_empty() || part == ".") {
        return Err("review note path must be normalized".to_string());
    }
    Ok(())
}

fn project_file(root: &str, path: &str) -> PathBuf {
    Path::new(root).join(path)
}
fn notes_path(root: &str) -> PathBuf {
    Path::new(root).join(NOTES_DIR).join(NOTES_FILE)
}
fn display_error(error: std::io::Error) -> String {
    error.to_string()
}

fn write_document(root: &str, document: &ReviewNotesDocument) -> Result<(), String> {
    let path = notes_path(root);
    let parent = path
        .parent()
        .ok_or_else(|| "review notes path has no parent".to_string())?;
    std::fs::create_dir_all(parent).map_err(display_error)?;
    let bytes = serde_json::to_vec_pretty(document).map_err(|error| error.to_string())?;
    let mut temporary = NamedTempFile::new_in(parent).map_err(display_error)?;
    use std::io::Write;
    temporary.write_all(&bytes).map_err(display_error)?;
    temporary.as_file().sync_all().map_err(display_error)?;
    temporary
        .persist(path)
        .map_err(|error| error.error.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests;
