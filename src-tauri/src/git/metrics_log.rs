// @Architecture(descriptionShort="Parses git log numstat output for module metrics")
use std::collections::BTreeMap;

const WINDOW_DAYS: u32 = 90;

pub struct CommitStat {
    pub epoch: u64,
    pub message: String,
    pub files: BTreeMap<String, (u32, u32)>,
}

/// Fetch non-merge commits with per-file add/delete counts in the last 90 days.
pub fn load_commit_stats(repo: &str) -> Result<Vec<CommitStat>, String> {
    let since = format!("{WINDOW_DAYS}.days.ago");
    let raw = git_bytes(
        repo,
        &[
            "log",
            &format!("--since={since}"),
            "--no-merges",
            "--format=COMMIT %H %ct %s",
            "--numstat",
        ],
    )?;
    Ok(parse_log(&String::from_utf8_lossy(&raw)))
}

fn parse_log(raw: &str) -> Vec<CommitStat> {
    let mut commits = Vec::new();
    let mut current: Option<CommitStat> = None;
    for line in raw.lines() {
        if let Some(rest) = line.strip_prefix("COMMIT ") {
            if let Some(c) = current.take() {
                commits.push(c);
            }
            current = Some(parse_commit_line(rest));
            continue;
        }
        if let Some(c) = current.as_mut() {
            if let Some((path, add, del)) = parse_numstat_line(line) {
                if !metrics_skip_path(&path) {
                    let entry = c.files.entry(path).or_insert((0, 0));
                    entry.0 += add;
                    entry.1 += del;
                }
            }
        }
    }
    if let Some(c) = current {
        commits.push(c);
    }
    commits
}

fn parse_commit_line(line: &str) -> CommitStat {
    let mut parts = line.splitn(3, ' ');
    parts.next(); // commit hash — unused after parse
    CommitStat {
        epoch: parts.next().and_then(|s| s.parse().ok()).unwrap_or(0),
        message: parts.next().unwrap_or("").into(),
        files: BTreeMap::new(),
    }
}

fn parse_numstat_line(line: &str) -> Option<(String, u32, u32)> {
    let mut cols = line.split('\t');
    let add = cols.next()?;
    let del = cols.next()?;
    let path = cols.next()?.replace('\\', "/");
    if add == "-" || del == "-" {
        return None;
    }
    Some((
        path,
        add.parse().unwrap_or(0),
        del.parse().unwrap_or(0),
    ))
}

pub fn metrics_skip_path(path: &str) -> bool {
    let lower = path.to_lowercase();
    if lower.ends_with(".lock")
        || lower.ends_with("package-lock.json")
        || lower.ends_with("pnpm-lock.yaml")
        || lower.ends_with("yarn.lock")
    {
        return true;
    }
    lower.contains("/generated/") || lower.contains(".generated.")
}

pub fn is_fix_commit(message: &str) -> bool {
    let m = message.to_lowercase();
    m.contains("fix")
        || m.contains("bug")
        || m.contains("hotfix")
        || m.contains("regression")
        || message.contains('#')
}

pub fn twr_weight(epoch: u64, min_epoch: u64, max_epoch: u64) -> f64 {
    if max_epoch <= min_epoch {
        return 1.0;
    }
    let t = (epoch.saturating_sub(min_epoch)) as f64 / (max_epoch - min_epoch) as f64;
    1.0 / (1.0 + (-12.0 * t + 12.0).exp())
}

pub fn window_days() -> u32 {
    WINDOW_DAYS
}

fn git_bytes(path: &str, args: &[&str]) -> Result<Vec<u8>, String> {
    use std::path::Path;
    use std::process::Command;
    let output = Command::new("git")
        .args(["-C"])
        .arg(Path::new(path))
        .args(args)
        .output()
        .map_err(|e| format!("failed to run git: {e}"))?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    Ok(output.stdout)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_log_splits_commits_and_numstat() {
        let raw = "COMMIT abc 100 fix bug\n10\t5\tsrc/a.ts\nCOMMIT def 200 feat\n3\t1\tsrc/b.ts\n";
        let commits = parse_log(raw);
        assert_eq!(commits.len(), 2);
        assert_eq!(commits[0].files.get("src/a.ts"), Some(&(10, 5)));
    }

    #[test]
    fn skip_lockfiles_and_generated() {
        assert!(metrics_skip_path("Cargo.lock"));
        assert!(metrics_skip_path("src/generated/foo.ts"));
        assert!(!metrics_skip_path("src/a.ts"));
    }

    #[test]
    fn fix_commit_heuristics() {
        assert!(is_fix_commit("fix: login"));
        assert!(is_fix_commit("closes #42"));
        assert!(!is_fix_commit("feat: add button"));
    }
}
