// CI quality gate: diagnostics only, no graph dump, no git metrics, no config writes.

mod args;
mod report;

#[cfg(test)]
mod tests;

use std::process::ExitCode;

use crate::analysis::{analyze_project_with_options, AnalyzeOptions};
use crate::analysis_fs_source;
use crate::contract::Diagnostic;

use args::{parse, CheckArgs};
use report::{render_stdout, report_from_kinds};

pub fn run_check(args: &[String]) -> ExitCode {
    if crate::cli::wants_help(args) {
        return crate::cli::run_help(Some("check"));
    }
    match parse(args) {
        Ok(parsed) => execute(&parsed),
        Err(message) => fail(&message),
    }
}

fn fail(message: &str) -> ExitCode {
    eprintln!("{message}");
    ExitCode::FAILURE
}

fn execute(args: &CheckArgs) -> ExitCode {
    match analyze_diagnostics(&args.path) {
        Ok(diagnostics) => print_report(&report_from_kinds(&diagnostics, &args.fail_on), args),
        Err(message) => fail(&message),
    }
}

#[cfg(test)]
fn evaluate(path: &str) -> Result<report::CheckReport, String> {
    Ok(report_from_kinds(
        &analyze_diagnostics(path)?,
        &report::DEFAULT_FAIL_ON,
    ))
}

fn analyze_diagnostics(path: &str) -> Result<Vec<Diagnostic>, String> {
    let source = analysis_fs_source(path);
    let options = AnalyzeOptions {
        metrics_window_days: 0,
        hide_top_level_dot_dirs: true,
    };
    let graph = analyze_project_with_options(&source, path, options)
        .map_err(|e| format!("analysis failed: {e}"))?;
    Ok(graph.diagnostics)
}

fn print_report(report: &report::CheckReport, args: &CheckArgs) -> ExitCode {
    match render_stdout(report, args.format, args.quiet) {
        Ok(Some(output)) => println!("{output}"),
        Ok(None) => {}
        Err(message) => return fail(&message),
    }
    if report.failed {
        ExitCode::FAILURE
    } else {
        ExitCode::SUCCESS
    }
}
