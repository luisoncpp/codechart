use crate::contract::DiagnosticKind;

use super::report::{parse_kind, DEFAULT_FAIL_ON};

pub(super) const USAGE: &str =
    "usage: codechart-cli check <project-dir> [--fail-on=kind,...] [--format=json|text] [--quiet]";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) enum ReportFormat {
    Text,
    Json,
}

#[derive(Debug, Clone, PartialEq)]
pub(super) struct CheckArgs {
    pub path: String,
    pub fail_on: Vec<DiagnosticKind>,
    pub format: ReportFormat,
    pub quiet: bool,
}

#[derive(Default)]
struct Parser {
    path: Option<String>,
    fail_on: Option<Vec<DiagnosticKind>>,
    format: Option<ReportFormat>,
    quiet: bool,
}

pub(super) fn parse(args: &[String]) -> Result<CheckArgs, String> {
    let mut parser = Parser::default();
    parser.consume(args)?;
    parser.finish()
}

impl Parser {
    fn consume(&mut self, args: &[String]) -> Result<(), String> {
        let mut rest = args.iter().map(String::as_str);
        while let Some(arg) = rest.next() {
            self.one(arg, &mut rest)?;
        }
        Ok(())
    }

    fn one<'a>(
        &mut self,
        arg: &str,
        rest: &mut impl Iterator<Item = &'a str>,
    ) -> Result<(), String> {
        if let Some(value) = take_flag(arg, rest, "--fail-on")? {
            self.fail_on = Some(parse_fail_kinds(&value)?);
            return Ok(());
        }
        if let Some(value) = take_flag(arg, rest, "--format")? {
            self.format = Some(parse_format(&value)?);
            return Ok(());
        }
        if arg == "--quiet" {
            self.quiet = true;
            return Ok(());
        }
        self.take_path(arg)
    }

    fn take_path(&mut self, arg: &str) -> Result<(), String> {
        if arg.starts_with('-') {
            return Err(format!("unknown flag: {arg}\n{USAGE}"));
        }
        if self.path.is_some() {
            return Err(USAGE.into());
        }
        self.path = Some(arg.to_string());
        Ok(())
    }

    fn finish(self) -> Result<CheckArgs, String> {
        let Some(path) = self.path else {
            return Err(USAGE.into());
        };
        Ok(CheckArgs {
            path,
            fail_on: self.fail_on.unwrap_or_else(|| DEFAULT_FAIL_ON.to_vec()),
            format: self.format.unwrap_or(ReportFormat::Text),
            quiet: self.quiet,
        })
    }
}

fn take_flag<'a>(
    arg: &str,
    rest: &mut impl Iterator<Item = &'a str>,
    name: &str,
) -> Result<Option<String>, String> {
    if let Some(value) = arg.strip_prefix(&format!("{name}=")) {
        return Ok(Some(value.to_string()));
    }
    if arg != name {
        return Ok(None);
    }
    let value = rest
        .next()
        .ok_or_else(|| format!("{name} requires a value\n{USAGE}"))?;
    Ok(Some(value.to_string()))
}

fn parse_fail_kinds(value: &str) -> Result<Vec<DiagnosticKind>, String> {
    let mut kinds = Vec::new();
    for part in value.split(',') {
        let name = part.trim();
        if name.is_empty() {
            return Err(format!("empty kind in --fail-on\n{USAGE}"));
        }
        kinds.push(parse_kind(name)?);
    }
    Ok(kinds)
}

fn parse_format(value: &str) -> Result<ReportFormat, String> {
    match value {
        "text" => Ok(ReportFormat::Text),
        "json" => Ok(ReportFormat::Json),
        other => Err(format!(
            "unknown format: {other} (expected json or text)\n{USAGE}"
        )),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn argv(parts: &[&str]) -> Vec<String> {
        parts.iter().map(|s| (*s).to_string()).collect()
    }

    #[test]
    fn flags_may_precede_or_follow_the_path() {
        let before = parse(&argv(&["--quiet", "--format=json", "src"])).unwrap();
        let after = parse(&argv(&["src", "--quiet", "--format", "json"])).unwrap();
        assert_eq!(before.path, "src");
        assert_eq!(before.format, ReportFormat::Json);
        assert!(before.quiet);
        assert_eq!(after, before);
    }

    #[test]
    fn fail_on_equals_and_space_forms() {
        let equals = parse(&argv(&["app", "--fail-on=unresolvedImport"])).unwrap();
        let space = parse(&argv(&["app", "--fail-on", "unresolvedImport"])).unwrap();
        assert_eq!(equals.fail_on, [DiagnosticKind::UnresolvedImport]);
        assert_eq!(space.fail_on, equals.fail_on);
    }

    #[test]
    fn fail_on_replaces_the_default_set() {
        let parsed = parse(&argv(&["app", "--fail-on=circularDependency,parseError"])).unwrap();
        assert_eq!(
            parsed.fail_on,
            [
                DiagnosticKind::CircularDependency,
                DiagnosticKind::ParseError
            ]
        );
    }

    #[test]
    fn unknown_kind_and_format_are_errors() {
        let kind = parse(&argv(&["app", "--fail-on=nope"])).unwrap_err();
        assert!(kind.contains("unknown diagnostic kind: nope"));
        let format = parse(&argv(&["app", "--format=yaml"])).unwrap_err();
        assert!(format.contains("unknown format: yaml"));
    }

    #[test]
    fn missing_path_prints_usage() {
        assert_eq!(parse(&argv(&["--quiet"])).unwrap_err(), USAGE);
    }
}
