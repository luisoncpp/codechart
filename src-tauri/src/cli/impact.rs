// @Architecture(descriptionShort="Headless CLI impact subcommand: topo layers, blast radius, and delta diagnostics as JSON")
use crate::analysis::{analyze_project_with_options, opens_file, AnalyzeOptions};
use crate::contract::ProjectGraph;
use crate::diff_impact::{analyze_diff_impact, DiffImpactInput, DiffImpactReport, DEFAULT_BLAST_DEPTH};
use crate::git::{self, WorkingTreeDiffInput};
use crate::{analysis_fs_source, should_skip_plugins_walk};
use std::collections::BTreeSet;
use std::process::ExitCode;

#[derive(Debug, Default, PartialEq)]
pub struct ImpactArgs {
    pub path: String,
    pub base: Option<String>,
    pub head: Option<String>,
    pub changed: Vec<String>,
    pub max_depth: usize,
}

pub fn run_impact(args: &[String]) -> ExitCode {
    if super::wants_help(args) {
        return super::run_help(Some("impact"));
    }
    let parsed = match parse_args(args) {
        Ok(p) => p,
        Err(msg) => {
            eprintln!("{msg}");
            return ExitCode::FAILURE;
        }
    };
    match execute_impact(&parsed) {
        Ok(json) => {
            println!("{json}");
            ExitCode::SUCCESS
        }
        Err(msg) => {
            eprintln!("{msg}");
            ExitCode::FAILURE
        }
    }
}

pub(crate) fn parse_args(args: &[String]) -> Result<ImpactArgs, String> {
    let mut out = ImpactArgs { max_depth: DEFAULT_BLAST_DEPTH, ..Default::default() };
    let mut i = 0;
    while i < args.len() {
        let arg = &args[i];
        if let Some(val) = take_flag(arg, args.get(i + 1), "--base", &mut i) {
            out.base = Some(val);
        } else if let Some(val) = take_flag(arg, args.get(i + 1), "--head", &mut i) {
            out.head = Some(val);
        } else if let Some(val) = take_flag(arg, args.get(i + 1), "--changed", &mut i) {
            out.changed.extend(val.split(',').map(str::trim).filter(|s| !s.is_empty()).map(str::to_string));
        } else if let Some(val) = take_flag(arg, args.get(i + 1), "--max-depth", &mut i) {
            out.max_depth = val.parse::<usize>().map_err(|_| format!("invalid --max-depth: {val}"))?;
        } else if arg.starts_with('-') {
            return Err(format!("unknown flag for impact: {arg}"));
        } else if out.path.is_empty() {
            out.path = arg.clone();
        } else {
            return Err(format!("unexpected argument: {arg}"));
        }
        i += 1;
    }
    if out.path.is_empty() {
        return Err("usage: codechart-cli impact <project-dir> [--base=ref] [--head=ref] [--changed=a,b] [--max-depth=N]".to_string());
    }
    Ok(out)
}

fn take_flag(arg: &str, next: Option<&String>, name: &str, index: &mut usize) -> Option<String> {
    if let Some(rest) = arg.strip_prefix(&format!("{name}=")) {
        return Some(rest.to_string());
    }
    if arg == name {
        if let Some(val) = next {
            *index += 1;
            return Some(val.clone());
        }
    }
    None
}

fn execute_impact(parsed: &ImpactArgs) -> Result<String, String> {
    let report = compute_impact(parsed)?;
    serde_json::to_string_pretty(&report).map_err(|e| format!("serialization failed: {e}"))
}

/// Analyze `parsed.path` (fs, refs, or working tree) and compute the impact report.
pub fn compute_impact(parsed: &ImpactArgs) -> Result<DiffImpactReport, String> {
    let (before, after, changed) = if !parsed.changed.is_empty() {
        let after = analyze_fs(&parsed.path)?;
        (None, after, parsed.changed.clone())
    } else if let (Some(base), Some(head)) = (&parsed.base, &parsed.head) {
        let before = analyze_git_ref(&parsed.path, base)?;
        let after = analyze_git_ref(&parsed.path, head)?;
        let diff = git::diff_refs(&parsed.path, base, head)?;
        (Some(before), after, extract_diff_paths(&diff))
    } else {
        let after = analyze_fs(&parsed.path)?;
        let base = parsed.base.as_deref().unwrap_or("HEAD");
        let before = if git::is_git_repo(&parsed.path) {
            analyze_git_ref(&parsed.path, base).ok()
        } else {
            None
        };
        let eligible: Vec<String> = after.modules.iter().map(|m| m.path.clone()).collect();
        let diff = git::working_tree_diff(WorkingTreeDiffInput {
            path: &parsed.path,
            base_ref: base,
            eligible_paths: &eligible,
            ignore_submodules: true,
        })?;
        (before, after, extract_diff_paths(&diff))
    };

    Ok(analyze_diff_impact(DiffImpactInput {
        before: before.as_ref(),
        after: &after,
        changed_module_ids: &changed,
        max_depth: parsed.max_depth,
    }))
}

pub fn analyze_fs(path: &str) -> Result<ProjectGraph, String> {
    let source = analysis_fs_source(path);
    analyze_project_with_options(
        &source,
        path,
        AnalyzeOptions { metrics_window_days: 0, hide_top_level_dot_dirs: true },
    )
    .map_err(|e| e.to_string())
}

fn analyze_git_ref(path: &str, git_ref: &str) -> Result<ProjectGraph, String> {
    let skip_plugins = should_skip_plugins_walk(path);
    let source = git::source_at_ref(path, git_ref, &|file_path| {
        if skip_plugins && crate::project_config::is_under_plugins_dir(file_path) {
            return false;
        }
        opens_file(file_path)
    })?;
    analyze_project_with_options(
        &source,
        path,
        AnalyzeOptions { metrics_window_days: 0, hide_top_level_dot_dirs: true },
    )
    .map_err(|e| e.to_string())
}

pub fn extract_diff_paths(diff_text: &str) -> Vec<String> {
    let mut paths = BTreeSet::new();
    for line in diff_text.lines() {
        let candidate = line
            .strip_prefix("+++ b/")
            .or_else(|| line.strip_prefix("+++ "));
        if let Some(raw) = candidate {
            let clean = raw.split('\t').next().unwrap_or(raw).trim();
            if !clean.is_empty() && clean != "/dev/null" {
                paths.insert(clean.trim_start_matches("./").to_string());
            }
        }
    }
    paths.into_iter().collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_impact_flags_and_extracts_diff_paths() {
        let args: Vec<String> = vec![
            "repo".into(),
            "--changed=src/a.ts,src/b.ts".into(),
            "--max-depth=4".into(),
        ];
        let parsed = parse_args(&args).unwrap();
        assert_eq!(parsed.path, "repo");
        assert_eq!(parsed.changed, vec!["src/a.ts", "src/b.ts"]);
        assert_eq!(parsed.max_depth, 4);

        let diff = "--- a/src/a.ts\n+++ b/src/a.ts\n--- a/src/del.ts\n+++ /dev/null\n";
        assert_eq!(extract_diff_paths(diff), vec!["src/a.ts"]);
    }

    #[test]
    fn executes_impact_on_ts_basic_fixture() {
        let fixture = concat!(env!("CARGO_MANIFEST_DIR"), "/../tests/fixtures/ts-basic-project");
        let parsed = ImpactArgs {
            path: fixture.to_string(),
            changed: vec!["src/core/todo.ts".to_string(), "src/core/store.ts".to_string()],
            max_depth: 3,
            ..Default::default()
        };
        let json = execute_impact(&parsed).unwrap();
        let val: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert_eq!(val["layers"].as_array().unwrap().len(), 2);
        assert!(!val["blastRadius"].as_array().unwrap().is_empty());
    }
}
