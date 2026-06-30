// @Architecture(descriptionShort="Git helpers for listing commits and reading tree snapshots")
mod metrics;
mod metrics_log;

pub use metrics::{enrich_module_metrics, metrics_window_days};

use std::collections::HashMap;
use std::io::{BufRead, BufReader, Read, Write};
use std::path::Path;
use std::process::{Command, Stdio};

use crate::project_source::MemoryProjectSource;

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitCommit {
    pub hash: String,
    pub message: String,
    pub date: String,
}

pub fn is_git_repo(path: &str) -> bool {
    git_output(path, &["rev-parse", "--git-dir"]).is_ok()
}

pub fn list_commits(path: &str, limit: u32) -> Result<Vec<GitCommit>, String> {
    let n = limit.max(1).to_string();
    let out = git_output(path, &["log", "-n", &n, "--format=%H\x1f%s\x1f%ci"])?;
    Ok(out
        .lines()
        .filter(|line| !line.is_empty())
        .filter_map(parse_commit_line)
        .collect())
}

pub fn diff_refs(path: &str, base_ref: &str, head_ref: &str) -> Result<String, String> {
    git_output(path, &["diff", base_ref, head_ref])
}

pub fn source_at_ref(path: &str, git_ref: &str) -> Result<MemoryProjectSource, String> {
    let entries = ls_tree_blobs(path, git_ref)?;
    if entries.is_empty() {
        return Ok(MemoryProjectSource::new(HashMap::new()));
    }
    let blobs = batch_read_blobs(path, &entries)?;
    let mut map = HashMap::with_capacity(blobs.len());
    for (rel_path, content) in blobs {
        map.insert(rel_path.replace('\\', "/"), content);
    }
    Ok(MemoryProjectSource::new(map))
}

fn ls_tree_blobs(path: &str, git_ref: &str) -> Result<Vec<(String, String)>, String> {
    let raw = git_bytes(path, &["ls-tree", "-r", "-z", git_ref])?;
    let mut entries = Vec::new();
    for entry in raw.split(|byte| *byte == 0) {
        if entry.is_empty() {
            continue;
        }
        let text = std::str::from_utf8(entry).map_err(|e| e.to_string())?;
        let (meta, rel_path) = text
            .split_once('\t')
            .ok_or_else(|| format!("invalid ls-tree entry: {text}"))?;
        let mut parts = meta.split_whitespace();
        let _mode = parts.next().ok_or("missing ls-tree mode")?;
        let object_type = parts.next().ok_or("missing ls-tree type")?;
        if object_type != "blob" {
            continue;
        }
        let sha = parts.next().ok_or("missing ls-tree sha")?.to_string();
        entries.push((rel_path.to_string(), sha));
    }
    Ok(entries)
}

fn batch_read_blobs(path: &str, entries: &[(String, String)]) -> Result<Vec<(String, String)>, String> {
    let mut child = Command::new("git");
    child
        .args(["-C"])
        .arg(Path::new(path))
        .args(["cat-file", "--batch"])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    let mut child = child
        .spawn()
        .map_err(|e| format!("failed to run git cat-file --batch: {e}"))?;

    {
        let stdin = child.stdin.as_mut().ok_or("git cat-file stdin unavailable")?;
        for (_, sha) in entries {
            writeln!(stdin, "{sha}").map_err(|e| e.to_string())?;
        }
    }

    let stdout = child.stdout.take().ok_or("git cat-file stdout unavailable")?;
    let mut reader = BufReader::new(stdout);
    let mut out = Vec::with_capacity(entries.len());
    for (rel_path, sha) in entries {
        out.push((rel_path.clone(), read_blob(&mut reader, sha)?));
    }

    let status = child.wait().map_err(|e| e.to_string())?;
    if !status.success() {
        return Err("git cat-file --batch failed".into());
    }
    Ok(out)
}

fn read_blob(reader: &mut BufReader<impl Read>, expected_sha: &str) -> Result<String, String> {
    let mut header = String::new();
    reader
        .read_line(&mut header)
        .map_err(|e| format!("failed to read cat-file header: {e}"))?;
    let header = header.trim_end();
    let mut parts = header.split(' ');
    let sha = parts.next().ok_or("missing cat-file sha")?;
    let object_type = parts.next().ok_or("missing cat-file type")?;
    let size = parts
        .next()
        .ok_or("missing cat-file size")?
        .parse::<usize>()
        .map_err(|e| format!("invalid cat-file size: {e}"))?;
    if sha != expected_sha {
        return Err(format!("cat-file sha mismatch: expected {expected_sha}, got {sha}"));
    }
    if object_type != "blob" {
        return Err(format!("expected blob object, got {object_type}"));
    }

    let mut content = vec![0u8; size];
    reader
        .read_exact(&mut content)
        .map_err(|e| format!("failed to read blob content: {e}"))?;
    let mut trailing_newline = [0u8; 1];
    reader
        .read_exact(&mut trailing_newline)
        .map_err(|e| format!("failed to read blob trailing newline: {e}"))?;
    if trailing_newline[0] != b'\n' {
        return Err("expected newline after blob content".into());
    }
    Ok(String::from_utf8_lossy(&content).into_owned())
}

fn parse_commit_line(line: &str) -> Option<GitCommit> {
    let mut parts = line.split('\x1f');
    Some(GitCommit {
        hash: parts.next()?.to_string(),
        message: parts.next()?.to_string(),
        date: parts.next()?.to_string(),
    })
}

fn git_output(path: &str, args: &[&str]) -> Result<String, String> {
    let bytes = git_bytes(path, args)?;
    Ok(String::from_utf8_lossy(&bytes).trim_end().to_string())
}

fn git_bytes(path: &str, args: &[&str]) -> Result<Vec<u8>, String> {
    let mut cmd = Command::new("git");
    cmd.args(["-C"]).arg(Path::new(path)).args(args);
    let output = cmd
        .output()
        .map_err(|e| format!("failed to run git: {e}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(stderr.trim().to_string());
    }
    Ok(output.stdout)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::project_source::{ProjectSource, ProjectSourceError};
    use std::collections::HashMap;

    #[test]
    fn parse_commit_line_splits_fields() {
        let commit = parse_commit_line("abc123\x1finit\x1f2026-01-01").unwrap();
        assert_eq!(commit.hash, "abc123");
        assert_eq!(commit.message, "init");
    }

    #[test]
    fn memory_source_from_map_reads() {
        let source = MemoryProjectSource::new(HashMap::from([(
            "a.ts".into(),
            "export {}".into(),
        )]));
        assert_eq!(source.read_file("a.ts").unwrap(), "export {}");
        assert!(matches!(
            source.read_file("missing.ts"),
            Err(ProjectSourceError::NotFound(_))
        ));
    }
}
