use super::*;
use crate::project_config::parse_group_def;

fn def(id: &str, dir: &str) -> GroupDef {
    GroupDef { id: id.into(), label: id.into(), dir: dir.into(), ..Default::default() }
}

fn files(list: &[&str]) -> Vec<String> {
    list.iter().map(|s| s.to_string()).collect()
}

fn group<'a>(result: &'a ResolvedGroups, id: &str) -> &'a GroupNode {
    result.groups.iter().find(|g| g.id == id).expect("group present")
}

#[test]
fn folder_ownership_is_the_default_source() {
    let defs = vec![def("core", "src/core")];
    let fs = files(&["src/core/a.ts", "src/core/b.ts"]);
    let r = resolve_groups(&fs, &defs);
    assert_eq!(r.module_group.get("src/core/a.ts").map(String::as_str), Some("core"));
    assert_eq!(r.module_group.get("src/core/b.ts").map(String::as_str), Some("core"));
}

#[test]
fn glob_match_source_claims_across_folders() {
    let mut shared = def("shared", "");
    shared.match_globs = vec!["src/**/types.ts".into()];
    let fs = files(&["src/services/types.ts", "src/core/todo.ts"]);
    let r = resolve_groups(&fs, &[shared]);
    assert_eq!(r.module_group.get("src/services/types.ts").map(String::as_str), Some("shared"));
    assert!(!r.module_group.contains_key("src/core/todo.ts"), "glob doesn't match todo.ts");
}

#[test]
fn regex_match_source_uses_slash_delimiters() {
    let mut g = def("views", "");
    g.match_globs = vec!["/\\.view\\.tsx$/".into()];
    let fs = files(&["src/ui/Home.view.tsx", "src/ui/Home.tsx"]);
    let r = resolve_groups(&fs, &[g]);
    assert_eq!(r.module_group.get("src/ui/Home.view.tsx").map(String::as_str), Some("views"));
    assert!(!r.module_group.contains_key("src/ui/Home.tsx"));
}

#[test]
fn explicit_files_source_claims_by_path() {
    let mut g = def("shared", "");
    g.files = vec!["src/core/todo.ts".into()];
    let fs = files(&["src/core/todo.ts", "src/core/store.ts"]);
    let r = resolve_groups(&fs, &[g]);
    assert_eq!(r.module_group.get("src/core/todo.ts").map(String::as_str), Some("shared"));
    assert!(!r.module_group.contains_key("src/core/store.ts"));
}

#[test]
fn group_reference_sets_parent_without_direct_claim() {
    let mut app = def("app", "");
    app.group_refs = vec!["core".into()];
    let core = def("core", "src/core");
    let fs = files(&["src/core/x.ts"]);
    let r = resolve_groups(&fs, &[app, core]);
    assert_eq!(group(&r, "core").parent_id.as_deref(), Some("app"));
    assert_eq!(r.module_group.get("src/core/x.ts").map(String::as_str), Some("core"));
    assert!(group(&r, "app").parent_id.is_none());
}

#[test]
fn exclude_filters_folder_ownership() {
    let mut core = def("core", "src/core");
    core.exclude = vec!["todo.ts".into()];
    let fs = files(&["src/core/todo.ts", "src/core/store.ts"]);
    let r = resolve_groups(&fs, &[core]);
    assert!(!r.module_group.contains_key("src/core/todo.ts"));
    assert_eq!(r.module_group.get("src/core/store.ts").map(String::as_str), Some("core"));
}

#[test]
fn cross_folder_pull_made_disjoint_by_owner_exclude() {
    let mut core = def("core", "src/core");
    core.exclude = vec!["todo.ts".into()];
    let mut shared = def("shared", "");
    shared.files = vec!["src/core/todo.ts".into()];
    let fs = files(&["src/core/todo.ts", "src/core/store.ts"]);
    let r = resolve_groups(&fs, &[shared, core]);
    assert_eq!(r.module_group.get("src/core/todo.ts").map(String::as_str), Some("shared"));
    assert_eq!(r.module_group.get("src/core/store.ts").map(String::as_str), Some("core"));
    assert!(r.diagnostics.is_empty(), "no overlap when owner cedes");
}

#[test]
fn overlap_between_two_groups_is_a_config_error() {
    let core = def("core", "src/core");
    let mut shared = def("shared", "");
    shared.files = vec!["src/core/todo.ts".into()];
    let fs = files(&["src/core/todo.ts"]);
    let r = resolve_groups(&fs, &[shared, core]);
    assert!(!r.module_group.contains_key("src/core/todo.ts"), "ambiguous claim left unassigned");
    assert_eq!(r.diagnostics.len(), 1);
    assert_eq!(r.diagnostics[0].id, "configError:overlap:src/core/todo.ts");
}

#[test]
fn nested_group_md_sets_parent_via_directory() {
    let outer = def("outer", "src");
    let inner = def("inner", "src/core");
    let fs = files(&["src/main.ts", "src/core/x.ts"]);
    let r = resolve_groups(&fs, &[inner, outer]);
    assert_eq!(group(&r, "inner").parent_id.as_deref(), Some("outer"));
    assert!(group(&r, "outer").parent_id.is_none());
    assert_eq!(r.module_group.get("src/core/x.ts").map(String::as_str), Some("inner"));
    assert_eq!(r.module_group.get("src/main.ts").map(String::as_str), Some("outer"));
}

#[test]
fn facade_defaults_to_index_then_explicit_overrides() {
    let default_core = def("core", "src/core");
    let fs = files(&["src/core/index.ts", "src/core/store.ts"]);
    let r = resolve_groups(&fs, &[default_core]);
    assert_eq!(group(&r, "core").facade_module_ids, vec!["src/core/index.ts".to_string()]);
    assert!(r.facades.contains("src/core/index.ts"));

    let mut explicit = def("core", "src/core");
    explicit.facades = Some(vec!["store.ts".into()]);
    let r2 = resolve_groups(&fs, &[explicit]);
    assert_eq!(group(&r2, "core").facade_module_ids, vec!["src/core/store.ts".to_string()]);
}

#[test]
fn unknown_explicit_facade_is_a_config_error() {
    let mut core = def("core", "src/core");
    core.facades = Some(vec!["missing.ts".into()]);
    let fs = files(&["src/core/store.ts"]);
    let r = resolve_groups(&fs, &[core]);
    assert!(group(&r, "core").facade_module_ids.is_empty());
    assert_eq!(r.diagnostics.len(), 1);
    assert_eq!(r.diagnostics[0].id, "configError:facade:core:src/core/missing.ts");
}

#[test]
fn unmatched_file_falls_back_to_no_group() {
    let core = def("core", "src/core");
    let fs = files(&["src/core/x.ts", "src/main.ts"]);
    let r = resolve_groups(&fs, &[core]);
    assert!(!r.module_group.contains_key("src/main.ts"));
}

#[test]
fn folder_inference_when_no_group_files() {
    let fs = files(&["src/core/index.ts", "src/core/store.ts", "src/main.ts"]);
    let r = resolve_groups(&fs, &[]);
    assert_eq!(r.module_group.get("src/core/store.ts").map(String::as_str), Some("folder:src/core"));
    assert_eq!(r.module_group.get("src/main.ts").map(String::as_str), Some("folder:src"));
    assert_eq!(group(&r, "folder:src/core").parent_id.as_deref(), Some("folder:src"));
    assert!(r.facades.contains("src/core/index.ts"));
}

/// End-to-end against the real fixture: parse the five `*.group.md` files and the
/// 13 module paths, then check the assignment matches `golden/project-graph.json`.
#[test]
fn fixture_grouping_matches_golden() {
    let defs = fixture_defs();
    let fs = fixture_files();
    let r = resolve_groups(&fs, &defs);

    assert!(r.diagnostics.is_empty(), "golden grouping has no configErrors");
    assert_eq!(r.module_group.get("src/core/todo.ts").map(String::as_str), Some("shared"));
    assert_eq!(r.module_group.get("src/services/types.ts").map(String::as_str), Some("shared"));
    assert_eq!(r.module_group.get("src/core/store.ts").map(String::as_str), Some("core"));
    assert!(!r.module_group.contains_key("src/main.ts"), "main.ts stays ungrouped");

    assert_eq!(group(&r, "core").parent_id.as_deref(), Some("app"));
    assert_eq!(group(&r, "ui").parent_id.as_deref(), Some("app"));
    assert!(group(&r, "app").parent_id.is_none());
    assert!(group(&r, "shared").parent_id.is_none());

    assert_eq!(group(&r, "services").facade_module_ids, vec!["src/services/index.ts".to_string()]);
    assert!(group(&r, "app").facade_module_ids.is_empty());
    assert!(group(&r, "shared").facade_module_ids.is_empty());
    assert_eq!(group(&r, "core").color.as_deref(), Some("#7c3aed"));
    assert!(group(&r, "core").annotation.as_ref().unwrap().description_long.is_some());
}

fn fixture_defs() -> Vec<GroupDef> {
    let raw = [
        ("app.group.md", include_str!("../../../tests/fixtures/ts-basic-project/app.group.md")),
        ("shared.group.md", include_str!("../../../tests/fixtures/ts-basic-project/shared.group.md")),
        (
            "src/core/core.group.md",
            include_str!("../../../tests/fixtures/ts-basic-project/src/core/core.group.md"),
        ),
        (
            "src/services/services.group.md",
            include_str!("../../../tests/fixtures/ts-basic-project/src/services/services.group.md"),
        ),
        (
            "src/ui/ui.group.md",
            include_str!("../../../tests/fixtures/ts-basic-project/src/ui/ui.group.md"),
        ),
    ];
    let mut defs: Vec<GroupDef> = raw
        .iter()
        .map(|(path, content)| parse_group_def(path, content).expect("fixture parses"))
        .collect();
    defs.sort_by(|a, b| a.id.cmp(&b.id));
    defs
}

fn fixture_files() -> Vec<String> {
    files(&[
        "src/core/index.ts",
        "src/core/store.ts",
        "src/core/todo.ts",
        "src/core/validate.ts",
        "src/main.ts",
        "src/services/api.ts",
        "src/services/http.ts",
        "src/services/index.ts",
        "src/services/types.ts",
        "src/ui/App.tsx",
        "src/ui/TodoItem.tsx",
        "src/ui/TodoList.tsx",
        "src/ui/index.ts",
    ])
}
