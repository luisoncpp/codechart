use serde::{Deserialize, Serialize};
use std::path::{Component, Path, PathBuf};
use tempfile::NamedTempFile;

const REVIEWS_DIR: &str = ".codechart";
const REVIEWS_FILE: &str = "diff-reviews.json";
const VERSION: u32 = 1;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiffReview {
    pub diff_id: String,
    pub reviewed_paths: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiffReviewsDocument {
    pub version: u32,
    pub reviews: Vec<DiffReview>,
}

impl DiffReviewsDocument {
    fn empty() -> Self {
        Self {
            version: VERSION,
            reviews: Vec::new(),
        }
    }
}

/// Reviewed paths for one diff, reconciled against the diff's current paths:
/// entries for files no longer in the diff are dropped and the result persisted.
pub fn load_diff_review(
    root: &str,
    diff_id: &str,
    diff_paths: Vec<String>,
) -> Result<Vec<String>, String> {
    let mut document = read_document(root)?;
    let current: std::collections::HashSet<&String> = diff_paths.iter().collect();
    let reviewed = document
        .reviews
        .iter()
        .find(|review| review.diff_id == diff_id)
        .map(|review| review.reviewed_paths.clone())
        .unwrap_or_default();
    let reconciled: Vec<String> = reviewed
        .into_iter()
        .filter(|path| current.contains(path))
        .collect();
    // Persist only when reconciliation actually dropped stale paths.
    let stale = document
        .reviews
        .iter()
        .any(|review| review.diff_id == diff_id && review.reviewed_paths != reconciled);
    if stale {
        upsert(&mut document, diff_id, reconciled.clone());
        write_document(root, &document)?;
    }
    Ok(reconciled)
}

pub fn save_diff_review(
    root: &str,
    diff_id: &str,
    reviewed_paths: Vec<String>,
) -> Result<(), String> {
    let mut document = read_document(root)?;
    upsert(&mut document, diff_id, reviewed_paths);
    validate_document(&document)?;
    write_document(root, &document)
}

/// Wipe every persisted diff review entry (settings "clear review info").
pub fn clear_diff_reviews(root: &str) -> Result<(), String> {
    write_document(root, &DiffReviewsDocument::empty())
}

fn upsert(document: &mut DiffReviewsDocument, diff_id: &str, reviewed_paths: Vec<String>) {
    document.reviews.retain(|review| review.diff_id != diff_id);
    if !reviewed_paths.is_empty() {
        document.reviews.push(DiffReview {
            diff_id: diff_id.to_string(),
            reviewed_paths,
        });
    }
}

fn read_document(root: &str) -> Result<DiffReviewsDocument, String> {
    let file = reviews_path(root);
    if !file.exists() {
        return Ok(DiffReviewsDocument::empty());
    }
    let bytes = std::fs::read(&file).map_err(display_error)?;
    let document: DiffReviewsDocument = serde_json::from_slice(&bytes)
        .map_err(|error| format!("diff reviews file is malformed: {error}"))?;
    validate_document(&document)?;
    Ok(document)
}

fn validate_document(document: &DiffReviewsDocument) -> Result<(), String> {
    if document.version != VERSION {
        return Err(format!(
            "unsupported diff reviews version: {}",
            document.version
        ));
    }
    for review in &document.reviews {
        if review.diff_id.trim().is_empty() {
            return Err("diff review id cannot be blank".to_string());
        }
        for path in &review.reviewed_paths {
            validate_relative_path(path)?;
        }
    }
    Ok(())
}

fn validate_relative_path(path: &str) -> Result<(), String> {
    if path.is_empty() || path.contains('\\') {
        return Err("diff review path must be a relative POSIX path".to_string());
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
        return Err("diff review path escapes the project".to_string());
    }
    if path.split('/').any(|part| part.is_empty() || part == ".") {
        return Err("diff review path must be normalized".to_string());
    }
    Ok(())
}

fn reviews_path(root: &str) -> PathBuf {
    Path::new(root).join(REVIEWS_DIR).join(REVIEWS_FILE)
}

fn display_error(error: std::io::Error) -> String {
    error.to_string()
}

fn write_document(root: &str, document: &DiffReviewsDocument) -> Result<(), String> {
    let path = reviews_path(root);
    let parent = path
        .parent()
        .ok_or_else(|| "diff reviews path has no parent".to_string())?;
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
