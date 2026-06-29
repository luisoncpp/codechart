// @Architecture(descriptionShort="Resolves relative import specifiers to known module ids")

use std::collections::BTreeSet;

/// True for a specifier the resolver should try to turn into a graph edge:
/// relative imports only (`./x`, `../x`). Package imports are external metadata.
pub fn is_relative(specifier: &str) -> bool {
    specifier.starts_with('.')
}

/// Static asset extensions bundled at build time (JSON fixtures, images, fonts, …).
/// These are not parsed modules — no edge and no `unresolvedImport` diagnostic.
const ASSET_EXTENSIONS: &[&str] = &[
    "json", "svg", "png", "jpg", "jpeg", "gif", "webp", "ico", "woff", "woff2", "ttf", "eot",
    "mp3", "mp4", "wav", "webm",
];

/// True when `specifier` points at a static asset rather than a source module.
pub fn is_asset_import(specifier: &str) -> bool {
    let path = specifier.split('?').next().unwrap_or(specifier);
    match path.rsplit('.').next().filter(|e| *e != path) {
        Some(ext) => ASSET_EXTENSIONS.contains(&ext),
        None => false,
    }
}

/// Resolve a relative `specifier` imported from `importer` to a known module id,
/// or `None` when no candidate exists. Tries extensionless `.ts`/`.tsx`/`.rs`/`.cs`, an
/// explicit extension, `.js`/`.jsx`/`.mjs` (TS ESM → source `.ts`), then
/// `index.ts`/`index.tsx`/`mod.rs`.
pub fn resolve_relative(
    importer: &str,
    specifier: &str,
    known: &BTreeSet<&str>,
    item_fallback: bool,
) -> Option<String> {
    let mut base = normalize_join(parent_dir(importer), specifier);
    loop {
        if let Some(found) = resolve_base(&base, known) {
            return Some(found);
        }
        if !item_fallback {
            return None;
        }
        base = match parent_base(&base) {
            Some(parent) => parent,
            None => return None,
        };
    }
}

fn resolve_base(base: &str, known: &BTreeSet<&str>) -> Option<String> {
    candidates(base)
        .into_iter()
        .find(|candidate| known.contains(candidate.as_str()))
}

/// Drop the last path segment so `foo/bar/baz` can fall back to `foo/bar` when
/// `baz` is a Rust item (fn/const) rather than a module file.
fn parent_base(base: &str) -> Option<String> {
    base.rsplit_once('/').map(|(parent, _)| parent.to_string())
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
    if base.ends_with(".ts")
        || base.ends_with(".tsx")
        || base.ends_with(".rs")
        || base.ends_with(".cs")
        || base.ends_with(".css")
    {
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
        format!("{base}.cs"),
        format!("{base}.css"),
        format!("{base}/index.ts"),
        format!("{base}/index.tsx"),
        format!("{base}/mod.rs"),
    ]
}
