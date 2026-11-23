// @Architecture(descriptionShort="Resolve git refs to commit SHAs and compute merge bases")
use super::git_output;

/// Full SHA of the commit `git_ref` names in the repository at `path`.
pub fn resolve_commit(path: &str, git_ref: &str) -> Result<String, String> {
    let sha = git_output(path, &["rev-parse", "--verify", &format!("{git_ref}^{{commit}}")])?;
    non_empty(sha)
}

/// Best common ancestor of `a` and `b`.
pub fn merge_base(path: &str, a: &str, b: &str) -> Result<String, String> {
    non_empty(git_output(path, &["merge-base", a, b])?)
}

fn non_empty(out: String) -> Result<String, String> {
    let trimmed = out.trim();
    if trimmed.is_empty() {
        return Err("git returned no output".to_string());
    }
    Ok(trimmed.to_string())
}
