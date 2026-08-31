// Discoverability for the headless CLI: `help`, `--help`, `-h`.

use std::process::ExitCode;

const ROOT: &str = "\
codechart-cli — headless analysis and CI gate

Usage:
  codechart-cli <command> <path>
  codechart-cli help [command]

Commands:
  parse <file>      Imports, symbols, and @Architecture annotations
  groups <dir>      Resolved group tree
  analyze <dir>     Full ProjectGraph as pretty JSON (debug dump)
  check <dir>       Architecture CI gate: diagnostics only
  help [command]    This text, or help for one command
  version           Print the CLI version

Also accepted: --help and -h (root or after a command), --version and -V.
";

const PARSE: &str = "\
codechart-cli parse — parse one source file

Usage:
  codechart-cli parse <file.ts|tsx|rs|cs|cpp|h>

Prints imports, re-exports, exported symbols, and @Architecture annotations.
";

const GROUPS: &str = "\
codechart-cli groups — print the resolved group tree

Usage:
  codechart-cli groups <project-dir>

Walks *.group.md config and inferred folder groups. Debug dump, not a CI gate.
";

const ANALYZE: &str = "\
codechart-cli analyze — dump the ProjectGraph

Usage:
  codechart-cli analyze <project-dir>

Pretty-prints the full graph JSON (modules, edges, git metrics). Always exits 0
when analysis succeeds. For CI, use check instead.
";

const CHECK: &str = "\
codechart-cli check — architecture CI gate

Usage:
  codechart-cli check <project-dir> [options]

Prints diagnostics only (no graph, no git metrics). Does not write
.codechart/config.json. Exit 1 when a fail-on kind is present.

Options:
  --fail-on=kind,...   Replace the default fail set (comma-separated).
                       Also: --fail-on kind,kind  Last --fail-on wins.
  --format=json|text   text (default): kind  moduleId  message
                       json: compact JSON array of Diagnostic objects
  --quiet              No stdout; exit code is still the gate
  -h, --help           Show this help

Default fail-on:
  circularDependency, architectureViolation, configError, parseError

Kinds:
  parseError, unresolvedImport, unresolvedIpc, unresolvedUnityAsset,
  configError, architectureViolation, circularDependency

unresolvedImport / unresolvedIpc / unresolvedUnityAsset print but do not fail
unless listed. Flags may appear before or after <project-dir>.
";

const TOPICS: &str = "usage: codechart-cli help [parse|groups|analyze|check]";

pub fn wants_help(args: &[String]) -> bool {
    args.iter().any(|arg| arg == "--help" || arg == "-h")
}

pub fn run_help(topic: Option<&str>) -> ExitCode {
    match help_text(topic) {
        Ok(text) => {
            print!("{text}");
            ExitCode::SUCCESS
        }
        Err(message) => {
            eprintln!("{message}");
            ExitCode::FAILURE
        }
    }
}

pub(crate) fn help_text(topic: Option<&str>) -> Result<&'static str, String> {
    match normalize(topic) {
        None => Ok(ROOT),
        Some("parse") => Ok(PARSE),
        Some("groups") => Ok(GROUPS),
        Some("analyze") => Ok(ANALYZE),
        Some("check") => Ok(CHECK),
        Some(other) => Err(format!("unknown help topic: {other}\n{TOPICS}")),
    }
}

fn normalize(topic: Option<&str>) -> Option<&str> {
    match topic {
        None | Some("help") | Some("--help") | Some("-h") => None,
        other => other,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn each_command_has_help() {
        for topic in ["parse", "groups", "analyze", "check"] {
            assert!(
                help_text(Some(topic)).is_ok(),
                "{topic} should have a help page"
            );
        }
    }

    #[test]
    fn root_help_lists_every_command() {
        let text = help_text(None).unwrap();
        for name in ["parse", "groups", "analyze", "check", "help", "--version"] {
            assert!(text.contains(name), "root help should mention {name}");
        }
    }

    #[test]
    fn check_help_documents_flags_and_kinds() {
        let text = help_text(Some("check")).unwrap();
        assert!(text.contains("--fail-on"));
        assert!(text.contains("--format"));
        assert!(text.contains("--quiet"));
        assert!(text.contains("circularDependency"));
        assert!(text.contains("unresolvedImport"));
    }

    #[test]
    fn help_flags_are_aliases_of_root_help() {
        assert_eq!(help_text(Some("--help")).unwrap(), help_text(None).unwrap());
        assert_eq!(help_text(Some("-h")).unwrap(), help_text(None).unwrap());
        assert_eq!(help_text(Some("help")).unwrap(), help_text(None).unwrap());
    }

    #[test]
    fn unknown_topic_is_an_error() {
        let err = help_text(Some("lint")).unwrap_err();
        assert!(err.contains("unknown help topic: lint"));
        assert!(err.contains(TOPICS));
    }

    #[test]
    fn wants_help_detects_either_flag() {
        assert!(wants_help(&["--help".into()]));
        assert!(wants_help(&["src".into(), "-h".into()]));
        assert!(!wants_help(&["src".into(), "--quiet".into()]));
    }
}
