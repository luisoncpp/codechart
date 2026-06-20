// Dev CLI: inspect intermediate analysis output with no UI.
//
//   codechart-cli parse <file.ts|tsx>   — print imports + annotations
//
// `groups` and `analyze` land in later phases.

use std::process::ExitCode;

use codechart_lib::language_adapter::{registry_for_path, ParsedImport, ParsedModule};
use codechart_lib::semantic_comments::parse_annotations;

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().collect();
    match args.get(1).map(String::as_str) {
        Some("parse") => run_parse(args.get(2).map(String::as_str)),
        Some(other) => {
            eprintln!("unknown subcommand: {other}");
            ExitCode::FAILURE
        }
        None => {
            eprintln!("usage: codechart-cli parse <file.ts|tsx>");
            ExitCode::FAILURE
        }
    }
}

fn run_parse(path: Option<&str>) -> ExitCode {
    let Some(path) = path else {
        eprintln!("usage: codechart-cli parse <file.ts|tsx>");
        return ExitCode::FAILURE;
    };
    let Some(adapter) = registry_for_path(path) else {
        eprintln!("no adapter for: {path}");
        return ExitCode::FAILURE;
    };
    let source = match std::fs::read_to_string(path) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("cannot read {path}: {e}");
            return ExitCode::FAILURE;
        }
    };
    match adapter.parse(path, &source) {
        Ok(module) => print_module(&module, &source),
        Err(e) => {
            eprintln!("parse error: {e}");
            return ExitCode::FAILURE;
        }
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
