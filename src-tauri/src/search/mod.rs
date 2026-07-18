// @Architecture(descriptionShort="Case-insensitive full-text search over module sources")

use serde::{Deserialize, Serialize};

use crate::project_source::ProjectSource;

/// Stop scanning past this many matches to protect IPC on broad queries.
pub const MAX_MATCHES: usize = 500;
/// Matching lines are clipped to this many characters for the transport.
const MAX_LINE_TEXT_CHARS: usize = 200;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchMatch {
    pub path: String,
    /// 1-based line number in the module's source.
    pub line: u32,
    /// The matching line, trimmed and clipped to `MAX_LINE_TEXT_CHARS`.
    pub line_text: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub matches: Vec<SearchMatch>,
    /// True when scanning stopped at `MAX_MATCHES`; more matches exist.
    pub truncated: bool,
}

/// Case-insensitive substring search over the listed modules' sources.
/// One match per file (its first matching line); unreadable or deleted files are skipped.
pub fn search_sources(
    source: &dyn ProjectSource,
    query: &str,
    module_paths: &[String],
) -> SearchResult {
    let needle = query.to_lowercase();
    if needle.is_empty() {
        return SearchResult::default();
    }
    let mut matches = Vec::new();
    for path in module_paths {
        let Ok(body) = source.read_file(path) else {
            continue;
        };
        let Some(found) = file_match(path, &body, &needle) else {
            continue;
        };
        if matches.len() == MAX_MATCHES {
            return SearchResult {
                matches,
                truncated: true,
            };
        }
        matches.push(found);
    }
    SearchResult {
        matches,
        truncated: false,
    }
}

fn file_match(path: &str, body: &str, needle: &str) -> Option<SearchMatch> {
    body.lines()
        .enumerate()
        .find(|(_, line)| line.to_lowercase().contains(needle))
        .map(|(index, line)| SearchMatch {
            path: path.to_string(),
            line: (index + 1) as u32,
            line_text: clip_line(line),
        })
}

fn clip_line(line: &str) -> String {
    let trimmed = line.trim();
    match trimmed.char_indices().nth(MAX_LINE_TEXT_CHARS) {
        Some((byte_offset, _)) => trimmed[..byte_offset].to_string(),
        None => trimmed.to_string(),
    }
}

#[cfg(test)]
mod tests;
