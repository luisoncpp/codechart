// @Architecture(descriptionShort="Parses YAML frontmatter and body from a single group.md file")

use serde::Deserialize;

use super::{ConfigError, GroupDef};

/// YAML frontmatter shape. Every field is optional so a minimal block parses;
/// unknown keys are ignored (forward-compatible).
#[derive(Debug, Deserialize, Default)]
struct RawFrontmatter {
    id: Option<String>,
    label: Option<String>,
    color: Option<String>,
    icon: Option<String>,
    facades: Option<Vec<String>>,
    #[serde(rename = "match")]
    match_globs: Option<Vec<String>>,
    files: Option<Vec<String>>,
    groups: Option<Vec<String>>,
    exclude: Option<Vec<String>>,
    ignore: Option<Vec<String>>,
    #[serde(rename = "descriptionShort")]
    description_short: Option<String>,
}

/// Split a `*.group.md` file into (frontmatter yaml, body markdown). The body is
/// everything after the closing `---` fence.
fn split_frontmatter(content: &str) -> Result<(&str, &str), ConfigError> {
    let rest = content
        .strip_prefix("---")
        .and_then(|r| r.strip_prefix('\n').or_else(|| r.strip_prefix("\r\n")))
        .ok_or(ConfigError::MissingFrontmatter)?;
    let end = rest
        .find("\n---")
        .ok_or(ConfigError::MissingFrontmatter)?;
    let yaml = &rest[..end];
    let after = &rest[end + 4..];
    let body = after.trim_start_matches(['\r', '\n']);
    Ok((yaml, body))
}

/// First non-empty paragraph of the body, used when `descriptionShort` is absent.
fn first_paragraph(body: &str) -> Option<String> {
    body.split("\n\n")
        .map(str::trim)
        .find(|p| !p.is_empty() && !p.starts_with('#'))
        .map(|p| p.replace('\n', " "))
}

/// Parse one `*.group.md` file at repo-relative `path` into a [`GroupDef`].
pub fn parse_group_def(path: &str, content: &str) -> Result<GroupDef, ConfigError> {
    let (yaml, body) = split_frontmatter(content)?;
    let raw: RawFrontmatter =
        serde_yaml::from_str(yaml).map_err(|e| ConfigError::Yaml(e.to_string()))?;
    let dir = group_dir(path);
    let id = raw.id.unwrap_or_else(|| default_id(&dir));
    let label = raw.label.unwrap_or_else(|| humanize(&id));
    let body = body.trim();
    Ok(GroupDef {
        id,
        label,
        dir,
        color: raw.color,
        icon: raw.icon,
        facades: raw.facades,
        match_globs: raw.match_globs.unwrap_or_default(),
        files: raw.files.unwrap_or_default(),
        group_refs: raw.groups.unwrap_or_default(),
        exclude: raw.exclude.unwrap_or_default(),
        ignore: raw.ignore.unwrap_or_default(),
        description_short: raw.description_short.or_else(|| first_paragraph(body)),
        description_long: (!body.is_empty()).then(|| body.to_string()),
    })
}

/// Repo-relative POSIX folder containing a `*.group.md` file (`""` for root).
fn group_dir(path: &str) -> String {
    match path.rsplit_once('/') {
        Some((dir, _)) => dir.to_string(),
        None => String::new(),
    }
}

/// Default group id when frontmatter omits one: the folder's last segment, or
/// `root` for a root-placed file.
fn default_id(dir: &str) -> String {
    match dir.rsplit('/').next() {
        Some(seg) if !seg.is_empty() => seg.to_string(),
        _ => "root".to_string(),
    }
}

/// `data-access` / `data_access` → `Data Access`.
fn humanize(id: &str) -> String {
    id.split(['-', '_'])
        .filter(|w| !w.is_empty())
        .map(capitalize)
        .collect::<Vec<_>>()
        .join(" ")
}

fn capitalize(word: &str) -> String {
    let mut chars = word.chars();
    match chars.next() {
        Some(first) => first.to_uppercase().chain(chars).collect(),
        None => String::new(),
    }
}
