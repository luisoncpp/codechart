// @Architecture(descriptionShort="Resolves GitLab diff-note base/start/head SHAs from a CodeChart diffId via git")
use crate::git::{merge_base, resolve_commit};

const WORKING_TREE_WARNING: &str = "Working-tree diff: GitLab cannot comment on uncommitted code. head_sha is the \
    base ref; commit and push, then re-export with headSha.";

/// GitLab Discussions API `position` SHAs. `warning` explains SHAs that can't anchor real diff lines.
#[derive(Debug, Clone, PartialEq)]
pub(crate) struct DiffShas {
    pub base_sha: String,
    pub start_sha: String,
    pub head_sha: String,
    pub warning: Option<String>,
}

#[derive(Debug, Default)]
pub(crate) struct PartialShas {
    pub base: Option<String>,
    pub start: Option<String>,
    pub head: Option<String>,
    pub warning: Option<String>,
}

/// Caller-provided SHAs win; missing ones come from the diffId (`commits:<base>..<head>`,
/// `working-tree:<base>`). Paste diffs carry no refs. `None` while any of the three is unknown.
pub(crate) fn resolve_diff_shas(root: Option<&str>, diff_id: Option<&str>, provided: &PartialShas) -> Option<DiffShas> {
    let resolved = root.and_then(|r| shas_from_diff_id(r, diff_id?)).unwrap_or_default();
    let warning = if provided.head.is_some() { None } else { resolved.warning };
    Some(DiffShas {
        base_sha: provided.base.clone().or(resolved.base)?,
        start_sha: provided.start.clone().or(resolved.start)?,
        head_sha: provided.head.clone().or(resolved.head)?,
        warning,
    })
}

fn shas_from_diff_id(root: &str, diff_id: &str) -> Option<PartialShas> {
    if let Some(refs) = diff_id.strip_prefix("commits:") {
        let (base, head) = refs.split_once("..").filter(|(b, h)| !b.is_empty() && !h.is_empty())?;
        return Some(PartialShas {
            base: merge_base(root, base, head).ok(),
            start: resolve_commit(root, base).ok(),
            head: resolve_commit(root, head).ok(),
            warning: None,
        });
    }
    let sha = resolve_commit(root, diff_id.strip_prefix("working-tree:")?).ok();
    Some(PartialShas {
        base: sha.clone(),
        start: sha.clone(),
        head: sha,
        warning: Some(WORKING_TREE_WARNING.to_string()),
    })
}
