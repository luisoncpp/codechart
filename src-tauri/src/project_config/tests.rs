use std::collections::HashMap;

use super::*;
use crate::project_source::MemoryProjectSource;

#[test]
fn parses_full_frontmatter() {
    let md = "---\nid: core\nlabel: Core\ncolor: \"#7c3aed\"\nicon: cube\n\
              facades:\n  - index.ts\nexclude:\n  - todo.ts\n\
              descriptionShort: Domain types\n---\n\nDomain model body.\n";
    let def = parse_group_def("src/core/core.group.md", md).expect("valid");
    assert_eq!(def.id, "core");
    assert_eq!(def.label, "Core");
    assert_eq!(def.dir, "src/core");
    assert_eq!(def.color.as_deref(), Some("#7c3aed"));
    assert_eq!(def.facades, Some(vec!["index.ts".to_string()]));
    assert_eq!(def.exclude, vec!["todo.ts".to_string()]);
    assert_eq!(def.description_short.as_deref(), Some("Domain types"));
    assert_eq!(def.description_long.as_deref(), Some("Domain model body."));
    assert!(def.uses_folder_ownership(), "exclude alone is a filter, not a source");
}

#[test]
fn parses_minimal_frontmatter_with_defaults() {
    let def = parse_group_def("src/ui/ui.group.md", "---\n{}\n---\n").expect("valid");
    assert_eq!(def.id, "ui", "id defaults to folder segment");
    assert_eq!(def.label, "Ui", "label humanized from id");
    assert_eq!(def.dir, "src/ui");
    assert!(def.description_long.is_none());
}

#[test]
fn description_short_falls_back_to_first_paragraph() {
    let md = "---\nid: x\n---\n\n# Heading\n\nFirst real paragraph here.\n\nSecond.\n";
    let def = parse_group_def("x.group.md", md).expect("valid");
    assert_eq!(def.description_short.as_deref(), Some("First real paragraph here."));
}

#[test]
fn membership_sources_disable_folder_ownership() {
    let md = "---\nid: shared\nmatch:\n  - \"src/**/types.ts\"\n\
              files:\n  - src/core/todo.ts\n---\n";
    let def = parse_group_def("shared.group.md", md).expect("valid");
    assert_eq!(def.dir, "", "root-placed file");
    assert!(!def.uses_folder_ownership());
    assert_eq!(def.match_globs, vec!["src/**/types.ts".to_string()]);
}

#[test]
fn group_refs_and_ignore_parse() {
    let md = "---\nid: app\ngroups:\n  - core\n  - ui\n\
              ignore:\n  - dist/**\n---\n";
    let def = parse_group_def("app.group.md", md).expect("valid");
    assert_eq!(def.group_refs, vec!["core".to_string(), "ui".to_string()]);
    assert_eq!(def.ignore, vec!["dist/**".to_string()]);
    assert!(!def.uses_folder_ownership(), "groups is a source");
}

#[test]
fn architecture_doc_parses() {
    let md = "---\nid: core\narchitectureDoc: docs/architecture/contract.md\n---\n";
    let def = parse_group_def("src/core/core.group.md", md).expect("valid");
    assert_eq!(
        def.architecture_doc.as_deref(),
        Some("docs/architecture/contract.md"),
    );
}

#[test]
fn disconnected_config_parses() {
    let md = "---\nid: shared\ndisconnected: true\n\
              disconnectedModules:\n  - types.ts\n---\n";
    let def = parse_group_def("shared.group.md", md).expect("valid");
    assert!(def.disconnected);
    assert_eq!(def.disconnected_modules, vec!["types.ts".to_string()]);
}

#[test]
fn missing_frontmatter_is_a_config_error() {
    let err = parse_group_def("bad.group.md", "no fence here\n").unwrap_err();
    assert_eq!(err, ConfigError::MissingFrontmatter);
}

#[test]
fn malformed_yaml_is_a_config_error() {
    let err = parse_group_def("bad.group.md", "---\nid: [unclosed\n---\n").unwrap_err();
    assert!(matches!(err, ConfigError::Yaml(_)));
}

#[test]
fn discover_collects_defs_and_config_errors() {
    let mut files = HashMap::new();
    files.insert("a/a.group.md".to_string(), "---\nid: a\n---\nDoc A.\n".to_string());
    files.insert("b/b.group.md".to_string(), "broken\n".to_string());
    files.insert("a/code.ts".to_string(), "export const x = 1;".to_string());
    let source = MemoryProjectSource::new(files);

    let (defs, diagnostics) = discover_group_defs(&source);
    assert_eq!(defs.len(), 1, "only valid group files become defs");
    assert_eq!(defs[0].id, "a");
    assert_eq!(diagnostics.len(), 1);
    assert_eq!(diagnostics[0].kind, DiagnosticKind::ConfigError);
    assert_eq!(diagnostics[0].id, "configError:b/b.group.md");
}

#[test]
fn discover_rejects_duplicate_group_ids() {
    let mut files = HashMap::new();
    files.insert(
        "src/app/app.group.md".to_string(),
        "---\nid: app\n---\nApp shell.\n".to_string(),
    );
    files.insert(
        "tests/fixtures/app.group.md".to_string(),
        "---\nid: app\n---\nFixture app.\n".to_string(),
    );
    let source = MemoryProjectSource::new(files);

    let (defs, diagnostics) = discover_group_defs(&source);
    assert_eq!(defs.len(), 1, "first declaration wins (sorted path order)");
    assert_eq!(defs[0].id, "app");
    assert_eq!(diagnostics.len(), 1);
    assert!(diagnostics[0].message.contains("duplicate group id"));
}

#[test]
fn root_ignore_excludes_paths_from_group_discovery() {
    let mut files = HashMap::new();
    files.insert(
        "codechart.group.md".to_string(),
        "---\nid: root\nmatch:\n  - \"/$^/\"\nignore:\n  - tests/**\n---\n".to_string(),
    );
    files.insert(
        "tests/fixtures/app.group.md".to_string(),
        "---\nid: app\n---\n".to_string(),
    );
    let source = MemoryProjectSource::new(files);

    let (defs, diagnostics) = discover_group_defs(&source);
    assert_eq!(defs.len(), 1);
    assert_eq!(defs[0].id, "root");
    assert!(diagnostics.is_empty());
}
