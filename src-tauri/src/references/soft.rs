// @Architecture(descriptionShort="Emits soft edges pairing event emitters with listeners across modules")

use std::collections::{BTreeMap, BTreeSet};

use crate::contract::{Edge, EdgeKind};
use crate::language_adapter::{ParsedModule, SignalRole};

/// Per-token emitter/listener module sets (deduped — emitting a token twice in
/// one module counts once).
#[derive(Default)]
struct TokenPeers {
    emitters: BTreeSet<String>,
    listeners: BTreeSet<String>,
}

/// Pair emit/listen signals across modules into soft edges, deterministically.
pub fn classify_soft(parsed: &[ParsedModule]) -> Vec<Edge> {
    let mut peers = index_signals(parsed);
    let mut triples = pair_peers(&mut peers);
    triples.sort();
    build_soft_edges(triples)
}

/// Group every module's signals by token into emitter/listener sets.
fn index_signals(parsed: &[ParsedModule]) -> BTreeMap<String, TokenPeers> {
    let mut peers: BTreeMap<String, TokenPeers> = BTreeMap::new();
    for module in parsed {
        for signal in &module.signals {
            let entry = peers.entry(signal.token.clone()).or_default();
            let set = match signal.role {
                SignalRole::Emit => &mut entry.emitters,
                SignalRole::Listen => &mut entry.listeners,
            };
            set.insert(module.path.clone());
        }
    }
    peers
}

/// `(source, target, token)` for every cross-module emitter→listener pair.
fn pair_peers(peers: &mut BTreeMap<String, TokenPeers>) -> Vec<(String, String, String)> {
    let mut triples = Vec::new();
    for (token, sets) in peers.iter() {
        for emitter in &sets.emitters {
            for listener in &sets.listeners {
                if emitter == listener {
                    continue; // same module emits and listens — no self-edge
                }
                triples.push((emitter.clone(), listener.clone(), token.clone()));
            }
        }
    }
    triples
}

/// Assign per-`(source, target)` ordinals and build the soft edges.
fn build_soft_edges(triples: Vec<(String, String, String)>) -> Vec<Edge> {
    let mut edges = Vec::with_capacity(triples.len());
    let mut prev: Option<(String, String)> = None;
    let mut ordinal = 0;
    for (source, target, token) in triples {
        match &prev {
            Some(p) if *p == (source.clone(), target.clone()) => ordinal += 1,
            _ => ordinal = 0,
        }
        edges.push(soft_edge(&source, &target, &token, ordinal));
        prev = Some((source, target));
    }
    edges
}

/// A dashed `soft` edge. Id = `${source}->${target}:soft:${ordinal}`.
fn soft_edge(source: &str, target: &str, token: &str, ordinal: u32) -> Edge {
    Edge {
        id: format!("{source}->{target}:soft:{ordinal}"),
        source: source.to_string(),
        target: target.to_string(),
        kind: EdgeKind::Soft,
        trigger: format!("event:{token}"),
        is_violation: false,
    }
}
