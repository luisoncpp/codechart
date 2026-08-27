use crate::contract::{Diagnostic, DiagnosticKind};

use super::args::ReportFormat;

pub(super) const DEFAULT_FAIL_ON: [DiagnosticKind; 4] = [
    DiagnosticKind::CircularDependency,
    DiagnosticKind::ArchitectureViolation,
    DiagnosticKind::ConfigError,
    DiagnosticKind::ParseError,
];

const ALL_KINDS: [DiagnosticKind; 7] = [
    DiagnosticKind::ParseError,
    DiagnosticKind::UnresolvedImport,
    DiagnosticKind::UnresolvedIpc,
    DiagnosticKind::UnresolvedUnityAsset,
    DiagnosticKind::ConfigError,
    DiagnosticKind::ArchitectureViolation,
    DiagnosticKind::CircularDependency,
];

pub(super) struct CheckReport {
    pub diagnostics: Vec<Diagnostic>,
    pub failed: bool,
}

impl CheckReport {
    pub fn text_lines(&self) -> Vec<String> {
        self.diagnostics.iter().map(format_line).collect()
    }
}

#[cfg(test)]
pub(super) fn report_from(diagnostics: &[Diagnostic]) -> CheckReport {
    report_from_kinds(diagnostics, &DEFAULT_FAIL_ON)
}

pub(super) fn report_from_kinds(
    diagnostics: &[Diagnostic],
    fail_on: &[DiagnosticKind],
) -> CheckReport {
    CheckReport {
        diagnostics: diagnostics.to_vec(),
        failed: diagnostics.iter().any(|d| fail_on.contains(&d.kind)),
    }
}

pub(super) fn parse_kind(name: &str) -> Result<DiagnosticKind, String> {
    ALL_KINDS
        .into_iter()
        .find(|kind| kind_name(kind) == name)
        .ok_or_else(|| unknown_kind(name))
}

fn unknown_kind(name: &str) -> String {
    let expected: Vec<&str> = ALL_KINDS.iter().map(kind_name).collect();
    format!(
        "unknown diagnostic kind: {name} (expected {})",
        expected.join(", ")
    )
}

fn kind_name(kind: &DiagnosticKind) -> &'static str {
    match kind {
        DiagnosticKind::ParseError => "parseError",
        DiagnosticKind::UnresolvedImport => "unresolvedImport",
        DiagnosticKind::UnresolvedIpc => "unresolvedIpc",
        DiagnosticKind::UnresolvedUnityAsset => "unresolvedUnityAsset",
        DiagnosticKind::ConfigError => "configError",
        DiagnosticKind::ArchitectureViolation => "architectureViolation",
        DiagnosticKind::CircularDependency => "circularDependency",
    }
}

fn format_line(diagnostic: &Diagnostic) -> String {
    let location = diagnostic.module_id.as_deref().unwrap_or("-");
    format!(
        "{}  {}  {}",
        kind_name(&diagnostic.kind),
        location,
        diagnostic.message
    )
}

pub(super) fn render_stdout(
    report: &CheckReport,
    format: ReportFormat,
    quiet: bool,
) -> Result<Option<String>, String> {
    if quiet {
        return Ok(None);
    }
    match format {
        ReportFormat::Text => Ok(text_stdout(report)),
        ReportFormat::Json => json_stdout(report).map(Some),
    }
}

fn text_stdout(report: &CheckReport) -> Option<String> {
    let lines = report.text_lines();
    if lines.is_empty() {
        None
    } else {
        Some(lines.join("\n"))
    }
}

fn json_stdout(report: &CheckReport) -> Result<String, String> {
    serde_json::to_string(&report.diagnostics).map_err(|e| format!("serialization failed: {e}"))
}
