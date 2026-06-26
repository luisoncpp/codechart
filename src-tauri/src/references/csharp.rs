// @Architecture(descriptionShort="Resolves C# using directives to in-project namespace owners")

use std::collections::BTreeMap;

use crate::language_adapter::ParsedModule;

/// namespace → module paths that declare it (C# only).
pub fn index_namespaces(parsed: &[ParsedModule]) -> BTreeMap<String, Vec<String>> {
    let mut index: BTreeMap<String, Vec<String>> = BTreeMap::new();
    for module in parsed {
        let Some(namespace) = module.declared_namespace.as_deref() else {
            continue;
        };
        index
            .entry(namespace.to_string())
            .or_default()
            .push(module.path.clone());
    }
    for paths in index.values_mut() {
        paths.sort();
    }
    index
}

/// Resolve a C# `using` namespace to known module ids, if any.
pub fn resolve_namespace(
    namespace: &str,
    index: &BTreeMap<String, Vec<String>>,
) -> Option<Vec<String>> {
    index.get(namespace).cloned()
}

/// True when a module path should use namespace-based import resolution.
pub fn uses_namespace_resolution(path: &str) -> bool {
    path.ends_with(".cs")
}
