// @Architecture(descriptionShort="Atomic persistence and validation for per-diff Review Stacks")
mod types;

pub use types::{
    FindingSeverity, FindingSide, FindingStatus, ReviewBlocker, ReviewCohort, ReviewFinding,
    ReviewStackRecord, ReviewStacksDocument, VERSION,
};

use std::io::Write;
use std::path::{Component, Path, PathBuf};
use tempfile::NamedTempFile;

const STACKS_DIR: &str = ".codechart";
const STACKS_FILE: &str = "review-stacks.json";

pub fn load_review_stack(root: &str, diff_id: &str) -> Result<Option<ReviewStackRecord>, String> {
    let document = read_document(root)?;
    Ok(document.stacks.into_iter().find(|s| s.diff_id == diff_id))
}

pub fn save_review_stack(root: &str, stack: ReviewStackRecord) -> Result<(), String> {
    validate_stack(&stack)?;
    let mut document = read_document(root)?;
    document.stacks.retain(|s| s.diff_id != stack.diff_id);
    document.stacks.push(stack);
    write_document(root, &document)
}

pub fn delete_review_stack(root: &str, diff_id: &str) -> Result<(), String> {
    let mut document = read_document(root)?;
    let before = document.stacks.len();
    document.stacks.retain(|s| s.diff_id != diff_id);
    if document.stacks.len() == before {
        return Ok(());
    }
    write_document(root, &document)
}

pub fn clear_review_stacks(root: &str) -> Result<(), String> {
    if !stacks_path(root).exists() {
        return Ok(());
    }
    write_document(root, &ReviewStacksDocument::empty())
}

fn read_document(root: &str) -> Result<ReviewStacksDocument, String> {
    let file = stacks_path(root);
    if !file.exists() {
        return Ok(ReviewStacksDocument::empty());
    }
    let bytes = std::fs::read(&file).map_err(|e| e.to_string())?;
    let document: ReviewStacksDocument = serde_json::from_slice(&bytes)
        .map_err(|e| format!("review stacks file is malformed: {e}"))?;
    validate_document(&document)?;
    Ok(document)
}

fn validate_document(document: &ReviewStacksDocument) -> Result<(), String> {
    if document.version != VERSION {
        return Err(format!("unsupported review stacks version: {}", document.version));
    }
    for stack in &document.stacks {
        validate_stack(stack)?;
    }
    Ok(())
}

fn validate_stack(stack: &ReviewStackRecord) -> Result<(), String> {
    if stack.diff_id.trim().is_empty() {
        return Err("review stack diffId cannot be blank".to_string());
    }
    for cohort in &stack.cohorts {
        if cohort.id.trim().is_empty() {
            return Err("review cohort id cannot be blank".to_string());
        }
        for module_id in &cohort.module_ids {
            validate_relative_path(module_id)?;
        }
    }
    for finding in &stack.findings {
        validate_finding(finding)?;
    }
    Ok(())
}

fn validate_finding(finding: &ReviewFinding) -> Result<(), String> {
    if finding.id.trim().is_empty() {
        return Err("finding id cannot be blank".to_string());
    }
    validate_relative_path(&finding.path)?;
    if finding.start_line == 0 || finding.end_line < finding.start_line {
        return Err(format!("invalid line range on finding {}", finding.id));
    }
    Ok(())
}

fn validate_relative_path(path: &str) -> Result<(), String> {
    if path.is_empty() || path.contains('\\') {
        return Err("review stack path must be a relative POSIX path".to_string());
    }
    let candidate = Path::new(path);
    let escapes = candidate.is_absolute()
        || candidate.components().any(|part| {
            matches!(part, Component::ParentDir | Component::RootDir | Component::Prefix(_))
        });
    if escapes {
        return Err("review stack path escapes the project".to_string());
    }
    if path.split('/').any(|part| part.is_empty() || part == ".") {
        return Err("review stack path must be normalized".to_string());
    }
    Ok(())
}

fn stacks_path(root: &str) -> PathBuf {
    Path::new(root).join(STACKS_DIR).join(STACKS_FILE)
}

fn write_document(root: &str, document: &ReviewStacksDocument) -> Result<(), String> {
    let path = stacks_path(root);
    let parent = path.parent().ok_or_else(|| "review stacks path has no parent".to_string())?;
    std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    let bytes = serde_json::to_vec_pretty(document).map_err(|e| e.to_string())?;
    let mut temp = NamedTempFile::new_in(parent).map_err(|e| e.to_string())?;
    temp.write_all(&bytes).map_err(|e| e.to_string())?;
    temp.as_file().sync_all().map_err(|e| e.to_string())?;
    temp.persist(path).map_err(|e| e.error.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests;
