// @Architecture(descriptionShort="Pairs Tauri invoke call sites with command handlers across modules")

use std::collections::{BTreeMap, BTreeSet};

use crate::contract::{Diagnostic, DiagnosticKind, Edge, EdgeKind, Severity};
use crate::language_adapter::ParsedModule;

/// Pair TS `invoke("cmd")` sites with Rust `#[tauri::command] fn cmd` handlers.
pub fn classify_tauri_ipc(parsed: &[ParsedModule]) -> (Vec<Edge>, Vec<Diagnostic>) {
    let commands = index_commands(parsed);
    let invokes = index_invokes(parsed);
    let mut edges = pair_ipc(&commands, &invokes);
    let mut diagnostics = orphan_invokes(&commands, parsed);
    edges.sort_by(|a, b| a.id.cmp(&b.id));
    diagnostics.sort_by(|a, b| a.id.cmp(&b.id));
    (edges, diagnostics)
}

fn index_commands(parsed: &[ParsedModule]) -> BTreeMap<String, BTreeSet<String>> {
    let mut map: BTreeMap<String, BTreeSet<String>> = BTreeMap::new();
    for module in parsed {
        for command in &module.ipc_commands {
            map.entry(command.clone())
                .or_default()
                .insert(module.path.clone());
        }
    }
    map
}

fn index_invokes(parsed: &[ParsedModule]) -> BTreeMap<String, BTreeSet<String>> {
    let mut map: BTreeMap<String, BTreeSet<String>> = BTreeMap::new();
    for module in parsed {
        for command in &module.ipc_invokes {
            map.entry(command.clone())
                .or_default()
                .insert(module.path.clone());
        }
    }
    map
}

fn pair_ipc(
    commands: &BTreeMap<String, BTreeSet<String>>,
    invokes: &BTreeMap<String, BTreeSet<String>>,
) -> Vec<Edge> {
    let mut triples = Vec::new();
    for (command, ts_modules) in invokes {
        let Some(rs_modules) = commands.get(command) else {
            continue;
        };
        for ts_module in ts_modules {
            for rs_module in rs_modules {
                if ts_module == rs_module {
                    continue;
                }
                triples.push((ts_module.clone(), rs_module.clone(), command.clone()));
            }
        }
    }
    triples.sort();
    build_ipc_edges(triples)
}

fn orphan_invokes(
    commands: &BTreeMap<String, BTreeSet<String>>,
    parsed: &[ParsedModule],
) -> Vec<Diagnostic> {
    let mut diagnostics = Vec::new();
    for module in parsed {
        for command in &module.ipc_invokes {
            if commands.contains_key(command) {
                continue;
            }
            diagnostics.push(unresolved_ipc_diagnostic(&module.path, command));
        }
    }
    diagnostics
}

fn unresolved_ipc_diagnostic(module_id: &str, command: &str) -> Diagnostic {
    Diagnostic {
        id: format!("unresolved-ipc:{module_id}:{command}"),
        severity: Severity::Warning,
        kind: DiagnosticKind::UnresolvedIpc,
        message: format!(
            "invoke(\"{command}\") has no matching #[tauri::command] handler"
        ),
        module_id: Some(module_id.to_string()),
        edge_id: None,
        unresolved_target: Some(command.to_string()),
    }
}

fn build_ipc_edges(triples: Vec<(String, String, String)>) -> Vec<Edge> {
    let mut edges = Vec::with_capacity(triples.len());
    let mut prev: Option<(String, String)> = None;
    let mut ordinal = 0u32;
    for (source, target, command) in triples {
        match &prev {
            Some(p) if *p == (source.clone(), target.clone()) => ordinal += 1,
            _ => ordinal = 0,
        }
        edges.push(ipc_edge(&source, &target, &command, ordinal));
        prev = Some((source, target));
    }
    edges
}

fn ipc_edge(source: &str, target: &str, command: &str, ordinal: u32) -> Edge {
    Edge {
        id: format!("{source}->{target}:ipc:{ordinal}"),
        source: source.to_string(),
        target: target.to_string(),
        kind: EdgeKind::Soft,
        trigger: format!("ipc:{command}"),
        is_violation: false,
    }
}
