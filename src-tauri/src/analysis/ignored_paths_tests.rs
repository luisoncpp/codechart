// End-to-end behavior of the project-config `ignoredPaths` list: an ignored
// directory contributes nothing to the graph — no module, no group, no edge, and
// no diagnostic.

use std::collections::HashMap;

use crate::contract::DiagnosticKind;
use crate::project_source::MemoryProjectSource;

use super::analyze_project;

fn memory(files: &[(&str, &str)]) -> MemoryProjectSource {
    let map: HashMap<String, String> = files
        .iter()
        .map(|(p, c)| ((*p).to_string(), (*c).to_string()))
        .collect();
    MemoryProjectSource::new(map)
}

fn config(ignored: &str) -> String {
    format!(r#"{{"editor":"code","ignoredPaths":[{ignored}]}}"#)
}

#[test]
fn an_ignored_directory_yields_no_modules_groups_or_diagnostics() {
    let source = memory(&[
        (crate::unreal_config::CONFIG_PATH, &config(r#""vendor""#)),
        ("src/a.ts", "export const a = 1;"),
        ("vendor/lib.ts", "export const lib = 1;"),
        // A bad group file inside the ignored directory must not even be parsed.
        ("vendor/vendor.group.md", "not valid frontmatter"),
    ]);
    let graph = analyze_project(&source, "mem").expect("builds");
    assert!(graph.modules.iter().any(|m| m.id == "src/a.ts"));
    assert!(
        graph.modules.iter().all(|m| !m.id.starts_with("vendor/")),
        "ignored modules should be absent: {:?}",
        graph.modules.iter().map(|m| &m.id).collect::<Vec<_>>()
    );
    assert!(graph.groups.iter().all(|g| !g.id.contains("vendor")));
    assert!(
        graph.diagnostics.is_empty(),
        "ignored paths should not emit diagnostics: {:?}",
        graph.diagnostics
    );
}

#[test]
fn an_import_into_an_ignored_directory_is_an_unresolved_import() {
    let source = memory(&[
        (crate::unreal_config::CONFIG_PATH, &config(r#""vendor""#)),
        ("src/a.ts", "import { lib } from '../vendor/lib';"),
        ("vendor/lib.ts", "export const lib = 1;"),
    ]);
    let graph = analyze_project(&source, "mem").expect("builds");
    assert!(graph.edges.is_empty(), "{:?}", graph.edges);
    // The target is gone from the parsed set, so a relative specifier that used
    // to resolve now reports like any other missing relative import.
    assert!(graph
        .diagnostics
        .iter()
        .any(|d| d.kind == DiagnosticKind::UnresolvedImport));
}

#[test]
fn an_ignored_path_does_not_match_a_same_named_sibling_directory() {
    let source = memory(&[
        (
            crate::unreal_config::CONFIG_PATH,
            &config(r#""src/vendor""#),
        ),
        ("src/vendor/a.ts", "export const a = 1;"),
        ("tools/vendor/b.ts", "export const b = 1;"),
    ]);
    let graph = analyze_project(&source, "mem").expect("builds");
    assert!(graph.modules.iter().any(|m| m.id == "tools/vendor/b.ts"));
    assert!(graph.modules.iter().all(|m| m.id != "src/vendor/a.ts"));
}

#[test]
fn a_config_without_ignored_paths_hides_nothing() {
    let source = memory(&[
        (
            crate::unreal_config::CONFIG_PATH,
            r#"{"editor":"code","unreal":{"knownPaths":[],"hideGeneratedFiles":false,"excludeEngineReferences":false,"hidePlugins":false}}"#,
        ),
        ("src/a.ts", "export const a = 1;"),
        ("vendor/lib.ts", "export const lib = 1;"),
    ]);
    let graph = analyze_project(&source, "mem").expect("builds");
    assert!(graph.modules.iter().any(|m| m.id == "vendor/lib.ts"));
}
