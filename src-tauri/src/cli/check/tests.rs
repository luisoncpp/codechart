use crate::contract::{Diagnostic, DiagnosticKind, Severity};

use super::args::ReportFormat;
use super::evaluate;
use super::report::{render_stdout, report_from, report_from_kinds};

const FIXTURE_DIR: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../tests/fixtures/ts-basic-project"
);
const UNREAL_DIR: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../tests/fixtures/unreal-mini-project"
);

fn diag(kind: DiagnosticKind, message: &str) -> Diagnostic {
    Diagnostic {
        id: format!("test:{message}"),
        severity: Severity::Warning,
        kind,
        message: message.to_string(),
        module_id: Some("a.ts".into()),
        edge_id: None,
        unresolved_target: None,
    }
}

#[test]
fn empty_diagnostics_pass_silently() {
    let report = report_from(&[]);
    assert!(!report.failed);
    assert!(report.text_lines().is_empty());
}

#[test]
fn unresolved_import_is_printed_but_does_not_fail() {
    let report = report_from(&[diag(
        DiagnosticKind::UnresolvedImport,
        "Cannot resolve import",
    )]);
    assert!(!report.failed);
    assert_eq!(
        report.text_lines(),
        ["unresolvedImport  a.ts  Cannot resolve import"]
    );
}

#[test]
fn default_fail_kinds_fail_the_gate() {
    for kind in [
        DiagnosticKind::CircularDependency,
        DiagnosticKind::ArchitectureViolation,
        DiagnosticKind::ConfigError,
        DiagnosticKind::ParseError,
    ] {
        let label = format!("{kind:?}");
        let report = report_from(&[diag(kind, "finding")]);
        assert!(report.failed, "{label} should fail the gate");
    }
}

#[test]
fn mixed_findings_print_all_and_fail_on_gate_kinds() {
    let report = report_from(&[
        diag(DiagnosticKind::UnresolvedImport, "missing"),
        diag(DiagnosticKind::ArchitectureViolation, "bypass"),
    ]);
    assert!(report.failed);
    let lines = report.text_lines();
    assert_eq!(lines.len(), 2);
    assert!(lines[0].starts_with("unresolvedImport"));
    assert!(lines[1].starts_with("architectureViolation"));
}

#[test]
fn fail_on_replaces_defaults_so_unresolved_can_opt_in() {
    let fail_on = [DiagnosticKind::UnresolvedImport];
    let unresolved = report_from_kinds(
        &[diag(DiagnosticKind::UnresolvedImport, "missing")],
        &fail_on,
    );
    let bypass = report_from_kinds(
        &[diag(DiagnosticKind::ArchitectureViolation, "bypass")],
        &fail_on,
    );
    assert!(unresolved.failed);
    assert!(!bypass.failed);
}

#[test]
fn json_format_is_a_compact_diagnostic_array() {
    let report = report_from(&[diag(DiagnosticKind::ParseError, "bad")]);
    let json = render_stdout(&report, ReportFormat::Json, /*quiet=*/ false)
        .unwrap()
        .expect("json stdout");
    assert!(!json.contains('\n'));
    let parsed: Vec<Diagnostic> = serde_json::from_str(&json).unwrap();
    assert_eq!(parsed, report.diagnostics);
    assert_eq!(
        render_stdout(&report_from(&[]), ReportFormat::Json, /*quiet=*/ false)
            .unwrap()
            .expect("empty json"),
        "[]"
    );
}

#[test]
fn quiet_suppresses_stdout_and_keeps_the_exit_signal() {
    let report = report_from(&[diag(DiagnosticKind::ParseError, "bad")]);
    assert!(report.failed);
    assert_eq!(
        render_stdout(&report, ReportFormat::Text, /*quiet=*/ true).unwrap(),
        None
    );
    assert_eq!(
        render_stdout(&report, ReportFormat::Json, /*quiet=*/ true).unwrap(),
        None
    );
}

#[test]
fn ts_basic_fixture_fails_on_planted_facade_bypass() {
    let report = evaluate(FIXTURE_DIR).expect("fixture analyzes");
    assert!(report.failed);
    let lines = report.text_lines();
    assert!(lines
        .iter()
        .any(|line| line.starts_with("architectureViolation")));
    assert!(lines
        .iter()
        .any(|line| line.starts_with("unresolvedImport")));
}

#[test]
fn import_cycle_fails_the_gate() {
    let dir = tempfile::tempdir().expect("temp dir");
    let root = dir.path();
    std::fs::write(
        root.join("a.ts"),
        "import { b } from './b'; export const a = 1;\n",
    )
    .expect("write a.ts");
    std::fs::write(
        root.join("b.ts"),
        "import { a } from './a'; export const b = 1;\n",
    )
    .expect("write b.ts");
    let report = evaluate(root.to_str().expect("utf8 path")).expect("cycle project analyzes");
    assert!(report.failed);
    assert!(report
        .text_lines()
        .iter()
        .any(|line| line.starts_with("circularDependency")));
}

#[test]
fn check_does_not_persist_unreal_config() {
    let config = std::path::Path::new(UNREAL_DIR).join(".codechart/config.json");
    assert!(!config.exists(), "fixture must not ship a config file");
    evaluate(UNREAL_DIR).expect("unreal fixture analyzes");
    assert!(
        !config.exists(),
        "check must not write .codechart/config.json"
    );
}
