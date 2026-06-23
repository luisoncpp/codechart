// @Architecture(descriptionShort="Emits soft edges pairing interface importers with cross-group implementors")

use std::collections::{BTreeMap, BTreeSet};

use crate::contract::{Edge, EdgeKind};
use crate::language_adapter::ParsedModule;
use crate::references::GroupBoundaries;

/// Bundles the boundary facts needed to validate each candidate seam.
struct SeamCtx<'a> {
    boundaries: &'a GroupBoundaries,
    import_pairs: &'a BTreeSet<(String, String)>,
}

/// Pair interface importers with cross-group implementors into soft seam edges.
pub fn classify_interface_seams(
    parsed: &[ParsedModule],
    boundaries: &GroupBoundaries,
    import_pairs: &BTreeSet<(String, String)>,
) -> Vec<Edge> {
    let implementors = index_implementors(parsed);
    let importers = index_importers(parsed);
    let ctx = SeamCtx { boundaries, import_pairs };
    let mut triples = collect_triples(&implementors, &importers, &ctx);
    triples.sort();
    build_seam_edges(triples)
}

/// interface_name → set of module ids that have `class … implements InterfaceName`.
fn index_implementors(parsed: &[ParsedModule]) -> BTreeMap<String, BTreeSet<String>> {
    let mut map: BTreeMap<String, BTreeSet<String>> = BTreeMap::new();
    for module in parsed {
        for name in &module.implements {
            map.entry(name.clone()).or_default().insert(module.path.clone());
        }
    }
    map
}

/// interface_name → set of module ids that import a symbol with that name.
fn index_importers(parsed: &[ParsedModule]) -> BTreeMap<String, BTreeSet<String>> {
    let mut map: BTreeMap<String, BTreeSet<String>> = BTreeMap::new();
    for module in parsed {
        for import in &module.imports {
            for name in &import.names {
                map.entry(name.clone()).or_default().insert(module.path.clone());
            }
        }
    }
    map
}

/// `(importer, implementor, interface_name)` for every valid cross-group seam.
fn collect_triples(
    implementors: &BTreeMap<String, BTreeSet<String>>,
    importers: &BTreeMap<String, BTreeSet<String>>,
    ctx: &SeamCtx,
) -> Vec<(String, String, String)> {
    let mut triples = Vec::new();
    for (iface, impl_set) in implementors {
        let Some(user_set) = importers.get(iface) else {
            continue;
        };
        for importer in user_set {
            for implementor in impl_set {
                if is_valid_seam(importer, implementor, ctx) {
                    triples.push((importer.clone(), implementor.clone(), iface.clone()));
                }
            }
        }
    }
    triples
}

fn is_valid_seam(importer: &str, implementor: &str, ctx: &SeamCtx) -> bool {
    if importer == implementor {
        return false;
    }
    if same_group(importer, implementor, ctx.boundaries) {
        return false; // same group → solid import already models it
    }
    !ctx.import_pairs.contains(&(importer.to_string(), implementor.to_string()))
}

fn same_group(a: &str, b: &str, bounds: &GroupBoundaries) -> bool {
    bounds.module_group.get(a) == bounds.module_group.get(b)
}

/// Assign per-`(source, target)` ordinals and build the seam edges.
fn build_seam_edges(triples: Vec<(String, String, String)>) -> Vec<Edge> {
    let mut edges = Vec::with_capacity(triples.len());
    let mut prev: Option<(String, String)> = None;
    let mut ordinal = 0u32;
    for (source, target, iface) in triples {
        match &prev {
            Some(p) if *p == (source.clone(), target.clone()) => ordinal += 1,
            _ => ordinal = 0,
        }
        edges.push(seam_edge(&source, &target, &iface, ordinal));
        prev = Some((source, target));
    }
    edges
}

fn seam_edge(source: &str, target: &str, iface: &str, ordinal: u32) -> Edge {
    Edge {
        id: format!("{source}->{target}:seam:{ordinal}"),
        source: source.to_string(),
        target: target.to_string(),
        kind: EdgeKind::Soft,
        trigger: format!("interface:{iface}"),
        is_violation: false,
    }
}
