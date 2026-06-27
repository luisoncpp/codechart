// @Architecture(descriptionShort="Resolves C# usings to modules via referenced types")

use std::collections::{BTreeMap, BTreeSet};

use crate::language_adapter::{ImportKind, ParsedImport, ParsedModule};

/// `(namespace, exported symbol) → declaring module paths` (C# only).
pub fn index_exports(parsed: &[ParsedModule]) -> BTreeMap<(String, String), Vec<String>> {
    let mut index: BTreeMap<(String, String), Vec<String>> = BTreeMap::new();
    for module in parsed {
        let Some(namespace) = module.declared_namespace.as_deref() else {
            continue;
        };
        for symbol in &module.exported_symbols {
            index
                .entry((namespace.to_string(), symbol.clone()))
                .or_default()
                .push(module.path.clone());
        }
    }
    for paths in index.values_mut() {
        paths.sort();
    }
    index
}

/// Resolve a C# import plus referenced types into target module ids.
pub fn resolve_import(
    import: &ParsedImport,
    referenced: &[String],
    index: &BTreeMap<(String, String), Vec<String>>,
) -> BTreeSet<String> {
    if !import.names.is_empty() {
        return lookup_type_path(&import.specifier, index);
    }
    if import.kind == ImportKind::Namespace {
        return resolve_static_using(&import.specifier, referenced, index);
    }
    resolve_namespace_using(&import.specifier, referenced, &import.names, index)
}

/// Match fully-qualified type references that appear in source without a `using`.
pub fn resolve_qualified_references(
    referenced: &[String],
    index: &BTreeMap<(String, String), Vec<String>>,
) -> BTreeSet<String> {
    let mut targets = BTreeSet::new();
    for symbol in referenced {
        if symbol.contains('.') {
            targets.extend(lookup_type_path(symbol, index));
        }
    }
    targets
}

fn resolve_namespace_using(
    namespace: &str,
    referenced: &[String],
    alias_names: &[String],
    index: &BTreeMap<(String, String), Vec<String>>,
) -> BTreeSet<String> {
    let mut targets = BTreeSet::new();
    for symbol in referenced {
        targets.extend(lookup_pair(namespace, symbol, index));
    }
    for alias in alias_names {
        targets.extend(lookup_pair(namespace, alias, index));
    }
    targets
}

fn resolve_static_using(
    specifier: &str,
    referenced: &[String],
    index: &BTreeMap<(String, String), Vec<String>>,
) -> BTreeSet<String> {
    let mut targets = lookup_type_path(specifier, index);
    if let Some((namespace, _)) = split_type_path(specifier) {
        targets.extend(resolve_namespace_using(&namespace, referenced, &[], index));
    }
    targets
}

fn lookup_type_path(
    path: &str,
    index: &BTreeMap<(String, String), Vec<String>>,
) -> BTreeSet<String> {
    let Some((namespace, symbol)) = split_type_path(path) else {
        return BTreeSet::new();
    };
    lookup_pair(&namespace, &symbol, index)
}

fn lookup_pair(
    namespace: &str,
    symbol: &str,
    index: &BTreeMap<(String, String), Vec<String>>,
) -> BTreeSet<String> {
    index
        .get(&(namespace.to_string(), symbol.to_string()))
        .map(|paths| paths.iter().cloned().collect())
        .unwrap_or_default()
}

fn split_type_path(path: &str) -> Option<(String, String)> {
    let (namespace, symbol) = path.rsplit_once('.')?;
    if namespace.is_empty() || symbol.is_empty() {
        return None;
    }
    Some((namespace.to_string(), symbol.to_string()))
}

/// True when a module path should use C# namespace/symbol import resolution.
pub fn uses_namespace_resolution(path: &str) -> bool {
    path.ends_with(".cs")
}
