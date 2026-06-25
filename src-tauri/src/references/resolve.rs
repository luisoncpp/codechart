// @Architecture(descriptionShort="Resolves relative import specifiers to known module ids")

use std::collections::BTreeSet;

/// True for a specifier the resolver should try to turn into a graph edge:
/// relative imports only (`./x`, `../x`). Package imports are external metadata.
pub fn is_relative(specifier: &str) -> bool {
    specifier.starts_with('.')
}

/// Resolve a relative `specifier` imported from `importer` to a known module id,
/// or `None` when no candidate exists. Tries extensionless `.ts`/`.tsx`/`.rs`, an
/// explicit `.ts`/`.tsx`/`.rs`, `.js`/`.jsx`/`.mjs` (TS ESM → source `.ts`), then
/// `index.ts`/`index.tsx`/`mod.rs`.
pub fn resolve_relative(
    importer: &str,
    specifier: &str,
    known: &BTreeSet<&str>,
) -> Option<String> {
    let base = normalize_join(parent_dir(importer), specifier);
    candidates(&base)
        .into_iter()
        .find(|candidate| known.contains(candidate.as_str()))
}

/// The folder containing `path` (`""` for a top-level file).
fn parent_dir(path: &str) -> &str {
    match path.rsplit_once('/') {
        Some((dir, _)) => dir,
        None => "",
    }
}

/// Join `spec` onto `dir`, collapsing `.` and `..` segments.
fn normalize_join(dir: &str, spec: &str) -> String {
    let mut parts: Vec<&str> = if dir.is_empty() {
        Vec::new()
    } else {
        dir.split('/').collect()
    };
    for seg in spec.split('/') {
        match seg {
            "" | "." => {}
            ".." => {
                parts.pop();
            }
            other => parts.push(other),
        }
    }
    parts.join("/")
}

/// Candidate module ids for a resolved base path, in resolution priority order.
fn candidates(base: &str) -> Vec<String> {
    if base.ends_with(".ts") || base.ends_with(".tsx") || base.ends_with(".rs") {
        return vec![base.to_string()];
    }
    if let Some(stem) = strip_js_like_extension(base) {
        let mut out = extensionless_candidates(stem);
        out.push(base.to_string());
        return out;
    }
    extensionless_candidates(base)
}

/// Strip a JS runtime extension from a specifier path (TS ESM often imports `./x.js` for `x.ts`).
fn strip_js_like_extension(base: &str) -> Option<&str> {
    base.strip_suffix(".js")
        .or_else(|| base.strip_suffix(".jsx"))
        .or_else(|| base.strip_suffix(".mjs"))
}

/// Extensionless import candidates: `.ts`/`.tsx`/`.rs`, then folder indexes.
fn extensionless_candidates(base: &str) -> Vec<String> {
    vec![
        format!("{base}.ts"),
        format!("{base}.tsx"),
        format!("{base}.rs"),
        format!("{base}/index.ts"),
        format!("{base}/index.tsx"),
        format!("{base}/mod.rs"),
    ]
}
