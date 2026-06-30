// @Architecture(descriptionShort="Computes git activity and bug-risk metrics per module")
use std::collections::BTreeMap;

use crate::contract::ModuleNode;

use super::metrics_log::{
    is_fix_commit, load_commit_stats, metrics_skip_path, twr_weight, window_days,
};

struct RawMetrics {
    churn_lines: u32,
    bug_risk: f64,
    fix_commits: u32,
}

/// Stamp 90-day git metrics onto analyzed modules when `repo` is a git checkout.
pub fn enrich_module_metrics(repo: &str, modules: &mut [ModuleNode]) {
    let Ok(commits) = load_commit_stats(repo) else {
        return;
    };
    if commits.is_empty() {
        return;
    }
    let min_epoch = commits.iter().map(|c| c.epoch).min().unwrap_or(0);
    let max_epoch = commits.iter().map(|c| c.epoch).max().unwrap_or(min_epoch);
    let raw = accumulate(&commits, min_epoch, max_epoch);
    for module in modules {
        apply_raw(module, raw.get(&module.path));
    }
}

fn accumulate(
    commits: &[super::metrics_log::CommitStat],
    min_epoch: u64,
    max_epoch: u64,
) -> BTreeMap<String, RawMetrics> {
    let mut out: BTreeMap<String, RawMetrics> = BTreeMap::new();
    for commit in commits {
        let weight = twr_weight(commit.epoch, min_epoch, max_epoch);
        let is_fix = is_fix_commit(&commit.message);
        for (path, (add, del)) in &commit.files {
            if metrics_skip_path(path) {
                continue;
            }
            let entry = out.entry(path.clone()).or_insert(RawMetrics {
                churn_lines: 0,
                bug_risk: 0.0,
                fix_commits: 0,
            });
            entry.churn_lines += add + del;
            if is_fix {
                entry.bug_risk += weight;
                entry.fix_commits += 1;
            }
        }
    }
    out
}

fn apply_raw(module: &mut ModuleNode, raw: Option<&RawMetrics>) {
    let Some(raw) = raw else {
        return;
    };
    let loc = module.metrics.loc.max(1) as f64;
    module.metrics.churn = Some(raw.churn_lines as f64 / loc);
    if raw.bug_risk > 0.0 {
        module.metrics.bug_risk = Some(raw.bug_risk);
    }
    if raw.fix_commits > 0 {
        module.metrics.fix_commits = Some(raw.fix_commits);
    }
}

pub fn metrics_window_days() -> u32 {
    window_days()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::contract::{Language, ModuleMetrics, ModuleNode};
    use std::fs;
    use std::process::Command;

    fn run_git(dir: &str, args: &[&str]) {
        let status = Command::new("git")
            .args(["-C", dir])
            .args(args)
            .status()
            .expect("git");
        assert!(status.success(), "git {:?} failed", args);
    }

    fn write(dir: &str, path: &str, content: &str) {
        let full = format!("{dir}/{path}");
        if let Some(parent) = std::path::Path::new(&full).parent() {
            fs::create_dir_all(parent).unwrap();
        }
        fs::write(full, content).unwrap();
    }

    #[test]
    fn enrich_module_metrics_from_git_history() {
        let dir = std::env::temp_dir().join("codechart-metrics-test");
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        run_git(dir.to_str().unwrap(), &["init"]);
        run_git(
            dir.to_str().unwrap(),
            &["config", "user.email", "t@example.com"],
        );
        run_git(dir.to_str().unwrap(), &["config", "user.name", "test"]);
        write(dir.to_str().unwrap(), "src/a.ts", "export const a = 1;\n");
        run_git(dir.to_str().unwrap(), &["add", "."]);
        run_git(dir.to_str().unwrap(), &["commit", "-m", "init"]);
        write(dir.to_str().unwrap(), "src/a.ts", "export const a = 2;\nexport const b = 3;\n");
        run_git(dir.to_str().unwrap(), &["add", "src/a.ts"]);
        run_git(dir.to_str().unwrap(), &["commit", "-m", "fix: bump a"]);
        let mut modules = vec![ModuleNode {
            id: "src/a.ts".into(),
            path: "src/a.ts".into(),
            label: "a.ts".into(),
            language: Language::TypeScript,
            group_id: None,
            is_facade: false,
            metrics: ModuleMetrics {
                loc: 2,
                ..Default::default()
            },
            exported_symbols: vec![],
            annotation: None,
        }];
        enrich_module_metrics(dir.to_str().unwrap(), &mut modules);
        assert!(modules[0].metrics.churn.unwrap() > 0.0);
        assert!(modules[0].metrics.bug_risk.unwrap() > 0.0);
        assert_eq!(modules[0].metrics.fix_commits, Some(1));
    }
}
