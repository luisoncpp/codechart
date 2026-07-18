use std::collections::HashMap;

use super::{search_sources, SearchResult, MAX_MATCHES};
use crate::project_source::MemoryProjectSource;

fn source_with(files: &[(&str, &str)]) -> MemoryProjectSource {
    let map: HashMap<String, String> = files
        .iter()
        .map(|(path, body)| (path.to_string(), body.to_string()))
        .collect();
    MemoryProjectSource::new(map)
}

fn paths(items: &[&str]) -> Vec<String> {
    items.iter().map(|p| p.to_string()).collect()
}

#[test]
fn finds_case_insensitive_matches_with_one_based_lines() {
    let source = source_with(&[("a.ts", "const x = 1;\n// todo later\nconst y = 2;")]);

    let result = search_sources(&source, "TODO", &paths(&["a.ts"]));

    assert_eq!(result.matches.len(), 1);
    assert_eq!(result.matches[0].path, "a.ts");
    assert_eq!(result.matches[0].line, 2);
    assert_eq!(result.matches[0].line_text, "// todo later");
    assert!(!result.truncated);
}

#[test]
fn emits_one_match_for_repeated_occurrences_on_the_same_line() {
    let source = source_with(&[("a.ts", "foo foo foo\nbar")]);

    let result = search_sources(&source, "foo", &paths(&["a.ts"]));

    assert_eq!(result.matches.len(), 1);
}

#[test]
fn emits_one_match_for_a_file_with_multiple_matching_lines() {
    let source = source_with(&[("a.ts", "foo\nfoo")]);

    let result = search_sources(&source, "foo", &paths(&["a.ts"]));

    assert_eq!(result.matches.len(), 1);
    assert_eq!(result.matches[0].line, 1);
}

#[test]
fn skips_missing_files_without_erroring() {
    let source = source_with(&[("a.ts", "needle")]);

    let result = search_sources(&source, "needle", &paths(&["gone.ts", "a.ts"]));

    assert_eq!(result.matches.len(), 1);
    assert_eq!(result.matches[0].path, "a.ts");
}

#[test]
fn only_scans_the_listed_module_paths() {
    let source = source_with(&[("a.ts", "needle"), ("b.ts", "needle")]);

    let result = search_sources(&source, "needle", &paths(&["a.ts"]));

    assert_eq!(result.matches.len(), 1);
    assert_eq!(result.matches[0].path, "a.ts");
}

#[test]
fn stops_at_the_match_cap_and_reports_truncation() {
    let files: Vec<(String, String)> = (0..=MAX_MATCHES)
        .map(|index| (format!("{index}.ts"), "needle".to_string()))
        .collect();
    let source_entries: Vec<(&str, &str)> = files
        .iter()
        .map(|(path, body)| (path.as_str(), body.as_str()))
        .collect();
    let source = source_with(&source_entries);
    let module_paths: Vec<String> = files.iter().map(|(path, _)| path.clone()).collect();

    let result = search_sources(&source, "needle", &module_paths);

    assert_eq!(result.matches.len(), MAX_MATCHES);
    assert!(result.truncated);
}

#[test]
fn clips_long_lines_to_the_transport_limit() {
    let body = format!("{}needle", "x".repeat(300));
    let source = source_with(&[("a.ts", body.as_str())]);

    let result = search_sources(&source, "needle", &paths(&["a.ts"]));

    assert_eq!(result.matches[0].line_text.chars().count(), 200);
}

#[test]
fn trims_surrounding_whitespace_from_line_text() {
    let source = source_with(&[("a.ts", "    indented needle    ")]);

    let result = search_sources(&source, "needle", &paths(&["a.ts"]));

    assert_eq!(result.matches[0].line_text, "indented needle");
}

#[test]
fn empty_query_returns_the_default_result() {
    let source = source_with(&[("a.ts", "anything")]);

    let result = search_sources(&source, "", &paths(&["a.ts"]));

    assert_eq!(result, SearchResult::default());
}
