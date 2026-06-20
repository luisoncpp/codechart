// Path resolution and membership matchers, private to `grouping`.
//
// `match` entries are globs by default; a `/…/`-delimited entry is a regex over
// the repo-relative path. Glob entries (and `files`/`facades`/`exclude` paths)
// are resolved relative to the group folder; regex matches the path verbatim.

use glob::Pattern;
use regex::Regex;

/// A compiled membership matcher over repo-relative POSIX paths.
pub enum Matcher {
    Glob(Pattern),
    Regex(Regex),
}

impl Matcher {
    pub fn matches(&self, path: &str) -> bool {
        match self {
            Matcher::Glob(p) => p.matches(path),
            Matcher::Regex(r) => r.is_match(path),
        }
    }
}

/// Build a matcher for one `match` entry placed in folder `dir`. A `/regex/`
/// entry compiles verbatim; anything else is a glob joined onto `dir`. Invalid
/// patterns yield `None` (the caller treats them as matching nothing).
pub fn build_matcher(dir: &str, entry: &str) -> Option<Matcher> {
    if let Some(inner) = entry.strip_prefix('/').and_then(|e| e.strip_suffix('/')) {
        return Regex::new(inner).ok().map(Matcher::Regex);
    }
    Pattern::new(&join_rel(dir, entry)).ok().map(Matcher::Glob)
}

/// Build an `exclude` glob matcher (always a glob, joined onto `dir`).
pub fn build_exclude(dir: &str, entry: &str) -> Option<Matcher> {
    Pattern::new(&join_rel(dir, entry)).ok().map(Matcher::Glob)
}

/// Resolve `rel` against folder `dir` into a normalized repo-relative POSIX path,
/// honoring `.`/`..` segments. `dir == ""` means the repo root.
pub fn join_rel(dir: &str, rel: &str) -> String {
    let mut parts: Vec<&str> = if dir.is_empty() {
        Vec::new()
    } else {
        dir.split('/').collect()
    };
    for seg in rel.split('/') {
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

/// True when `dir` is a strict ancestor folder of `path`'s folder/file.
/// Root (`""`) is an ancestor of everything except itself.
pub fn is_ancestor_dir(dir: &str, path: &str) -> bool {
    if dir.is_empty() {
        return !path.is_empty();
    }
    path.strip_prefix(dir).is_some_and(|rest| rest.starts_with('/'))
}
