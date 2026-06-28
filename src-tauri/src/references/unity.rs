// @Architecture(descriptionShort="Pairs Unity prefab YAML refs with C# scripts and other prefabs")

use std::collections::BTreeMap;

use crate::contract::{Diagnostic, DiagnosticKind, Edge, EdgeKind, Severity};
use crate::language_adapter::ParsedModule;

/// Resolve prefab script + nested prefab guids into soft edges and diagnostics.
pub fn classify_unity_assets(
    parsed: &[ParsedModule],
    meta_index: &BTreeMap<String, String>,
) -> (Vec<Edge>, Vec<Diagnostic>) {
    let mut edges = Vec::new();
    let mut diagnostics = Vec::new();
    for module in parsed {
        if module.unity_script_guids.is_empty() && module.unity_asset_guids.is_empty() {
            continue;
        }
        let (script_edges, script_diags) =
            resolve_script_refs(&module.path, &module.unity_script_guids, meta_index);
        let (prefab_edges, prefab_diags) =
            resolve_prefab_refs(&module.path, &module.unity_asset_guids, meta_index);
        edges.extend(script_edges);
        edges.extend(prefab_edges);
        diagnostics.extend(script_diags);
        diagnostics.extend(prefab_diags);
    }
    edges.sort_by(|a, b| a.id.cmp(&b.id));
    diagnostics.sort_by(|a, b| a.id.cmp(&b.id));
    (edges, diagnostics)
}

fn resolve_script_refs(
    prefab_path: &str,
    guids: &[String],
    meta_index: &BTreeMap<String, String>,
) -> (Vec<Edge>, Vec<Diagnostic>) {
    let mut edges = Vec::new();
    let mut diagnostics = Vec::new();
    let mut ordinal = 0u32;
    for guid in guids {
        match meta_index.get(guid) {
            Some(target) if target.ends_with(".cs") => {
                edges.push(unity_edge(
                    prefab_path,
                    target,
                    &format!("unity:script:{guid}"),
                    "unity-script",
                    ordinal,
                ));
                ordinal += 1;
            }
            Some(other) => diagnostics.push(unresolved_asset(
                prefab_path,
                guid,
                &format!("m_Script guid resolves to non-script {other}"),
            )),
            None => diagnostics.push(unresolved_asset(
                prefab_path,
                guid,
                &format!("m_Script guid {guid} has no matching .meta file"),
            )),
        }
    }
    (edges, diagnostics)
}

fn resolve_prefab_refs(
    prefab_path: &str,
    guids: &[String],
    meta_index: &BTreeMap<String, String>,
) -> (Vec<Edge>, Vec<Diagnostic>) {
    let mut edges = Vec::new();
    let mut diagnostics = Vec::new();
    let mut ordinal = 0u32;
    for guid in guids {
        match meta_index.get(guid) {
            Some(target) if target.ends_with(".prefab") => {
                if target == prefab_path {
                    continue;
                }
                edges.push(unity_edge(
                    prefab_path,
                    target,
                    &format!("unity:prefab:{guid}"),
                    "unity-prefab",
                    ordinal,
                ));
                ordinal += 1;
            }
            Some(_) => {}
            None => diagnostics.push(unresolved_asset(
                prefab_path,
                guid,
                &format!("prefab guid {guid} has no matching .meta file"),
            )),
        }
    }
    (edges, diagnostics)
}

fn unity_edge(
    source: &str,
    target: &str,
    trigger: &str,
    id_tag: &str,
    ordinal: u32,
) -> Edge {
    Edge {
        id: format!("{source}->{target}:{id_tag}:{ordinal}"),
        source: source.to_string(),
        target: target.to_string(),
        kind: EdgeKind::Soft,
        trigger: trigger.to_string(),
        is_violation: false,
    }
}

fn unresolved_asset(prefab_path: &str, guid: &str, message: &str) -> Diagnostic {
    Diagnostic {
        id: format!("unresolved-unity:{prefab_path}:{guid}"),
        severity: Severity::Warning,
        kind: DiagnosticKind::UnresolvedUnityAsset,
        message: message.to_string(),
        module_id: Some(prefab_path.to_string()),
        edge_id: None,
        unresolved_target: Some(guid.to_string()),
    }
}
