// Diagnostic-kind vocabulary shared by the flag parser and the report renderer.
// Lives apart from both so `--fail-on` parsing does not depend on rendering.

use crate::contract::DiagnosticKind;

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

pub(super) fn kind_name(kind: &DiagnosticKind) -> &'static str {
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_kind_round_trips_through_its_name() {
        for kind in ALL_KINDS {
            assert_eq!(parse_kind(kind_name(&kind)).unwrap(), kind);
        }
    }
}
