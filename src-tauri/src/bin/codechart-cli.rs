// Dev CLI: inspect intermediate analysis output with no UI.
//
//   codechart-cli parse   <file.ts|tsx>   — print imports + annotations
//   codechart-cli groups  <project-dir>   — print the resolved group tree
//   codechart-cli analyze <project-dir>   — print the full ProjectGraph as JSON

use std::process::ExitCode;

use codechart_lib::analysis::analyze_project;
use codechart_lib::grouping::{resolve_groups, ResolvedGroups};
use codechart_lib::language_adapter::{registry_for_path, ParsedImport, ParsedModule};
use codechart_lib::project_config::{discover_group_defs, ignore_patterns, is_group_file, retain_unignored};
use codechart_lib::project_source::{FsProjectSource, ProjectSource};
use codechart_lib::semantic_comments::parse_annotations;

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().collect();
    match args.get(1).map(String::as_str) {
        Some("parse") => run_parse(args.get(2).map(String::as_str)),
        Some("groups") => run_groups(args.get(2).map(String::as_str)),
        Some("analyze") => run_analyze(args.get(2).map(String::as_str)),
        Some(other) => fail(&format!("unknown subcommand: {other}")),
        None => fail("usage: codechart-cli <parse|groups|analyze> <path>"),
    }
}

fn run_analyze(path: Option<&str>) -> ExitCode {
    let Some(path) = path else {
        return fail("usage: codechart-cli analyze <project-dir>");
    };
    let source = FsProjectSource::new(path);
    let graph = match analyze_project(&source, path) {
        Ok(graph) => graph,
        Err(e) => return fail(&format!("analysis failed: {e:?}")),
    };
    match serde_json::to_string_pretty(&graph) {
        Ok(json) => println!("{json}"),
        Err(e) => return fail(&format!("serialization failed: {e}")),
    }
    ExitCode::SUCCESS
}

fn fail(message: &str) -> ExitCode {
    eprintln!("{message}");
    ExitCode::FAILURE
}

fn run_parse(path: Option<&str>) -> ExitCode {
    let Some(path) = path else {
        return fail("usage: codechart-cli parse <file.ts|tsx>");
    };
    let Some(adapter) = registry_for_path(path) else {
        return fail(&format!("no adapter for: {path}"));
    };
    let source = match std::fs::read_to_string(path) {
        Ok(s) => s,
        Err(e) => return fail(&format!("cannot read {path}: {e}")),
    };
    match adapter.parse(path, &source) {
        Ok(module) => print_module(&module, &source),
        Err(e) => return fail(&format!("parse error: {e}")),
    }
    ExitCode::SUCCESS
}

fn print_module(module: &ParsedModule, source: &str) {
    println!("{} ({} loc)", module.path, module.loc);
    println!("imports ({}):", module.imports.len());
    for import in &module.imports {
        print_import(import);
    }
    println!("re-exports ({}):", module.reexports.len());
    for import in &module.reexports {
        print_import(import);
    }
    println!("exported symbols: {}", module.exported_symbols.join(", "));
    let annotations = parse_annotations(source);
    println!("annotations ({}):", annotations.len());
    for annotation in &annotations {
        println!("  {annotation:?}");
    }
}

fn print_import(import: &ParsedImport) {
    let type_marker = if import.is_type_only { " [type]" } else { "" };
    println!(
        "  {:?}{} {} {{{}}}",
        import.kind,
        type_marker,
        import.specifier,
        import.names.join(", ")
    );
}

fn run_groups(path: Option<&str>) -> ExitCode {
    let Some(path) = path else {
        return fail("usage: codechart-cli groups <project-dir>");
    };
    let source = FsProjectSource::new(path);
    let (defs, mut diagnostics) = discover_group_defs(&source);
    let patterns = ignore_patterns(&defs);
    let all_files = retain_unignored(
        source.list_files().unwrap_or_default(),
        &patterns,
    );
    let modules = source_modules(&all_files);
    let resolved = resolve_groups(&modules, &defs);
    diagnostics.extend(resolved.diagnostics.iter().cloned());
    print_groups(&resolved, &modules, diagnostics.len());
    ExitCode::SUCCESS
}

/// Files an adapter can parse, excluding `*.group.md` config files.
fn source_modules(all_files: &[String]) -> Vec<String> {
    all_files
        .iter()
        .filter(|p| !is_group_file(p) && registry_for_path(p).is_some())
        .cloned()
        .collect()
}

fn print_groups(resolved: &ResolvedGroups, modules: &[String], diagnostic_count: usize) {
    println!(
        "{} groups, {} modules, {} diagnostics",
        resolved.groups.len(),
        modules.len(),
        diagnostic_count
    );
    let roots: Vec<&str> = resolved
        .groups
        .iter()
        .filter(|g| g.parent_id.is_none())
        .map(|g| g.id.as_str())
        .collect();
    for root in roots {
        print_group_tree(resolved, modules, root, 0);
    }
    print_ungrouped(resolved, modules);
}

fn print_group_tree(resolved: &ResolvedGroups, modules: &[String], id: &str, depth: usize) {
    let indent = "  ".repeat(depth);
    let group = resolved.groups.iter().find(|g| g.id == id).expect("group");
    let facades = group.facade_module_ids.join(", ");
    println!("{indent}- {} [{}] facades: [{}]", group.id, group.label, facades);
    for module in modules.iter().filter(|m| resolved.module_group.get(*m).map(String::as_str) == Some(id)) {
        println!("{indent}    {module}");
    }
    let children: Vec<&str> = resolved
        .groups
        .iter()
        .filter(|g| g.parent_id.as_deref() == Some(id))
        .map(|g| g.id.as_str())
        .collect();
    for child in children {
        print_group_tree(resolved, modules, child, depth + 1);
    }
}

fn print_ungrouped(resolved: &ResolvedGroups, modules: &[String]) {
    let ungrouped: Vec<&String> = modules
        .iter()
        .filter(|m| !resolved.module_group.contains_key(*m))
        .collect();
    if ungrouped.is_empty() {
        return;
    }
    println!("- (ungrouped)");
    for module in ungrouped {
        println!("    {module}");
    }
}
