// @Architecture(descriptionShort="Parses Unity .meta files into guid → asset path index")

use std::collections::BTreeMap;

use crate::project_source::ProjectSource;

/// Read `guid:` from a Unity `.meta` file body.
pub fn parse_meta_guid(content: &str) -> Option<String> {
    for line in content.lines() {
        let trimmed = line.trim();
        let Some(rest) = trimmed.strip_prefix("guid:") else {
            continue;
        };
        let guid: String = rest
            .trim()
            .chars()
            .take_while(|c| c.is_ascii_hexdigit())
            .collect();
        if guid.len() == 32 {
            return Some(guid.to_lowercase());
        }
    }
    None
}

/// Build a guid → repo-relative asset path map from every `*.meta` in `files`.
pub fn index_meta_files(
    source: &dyn ProjectSource,
    files: &[String],
) -> BTreeMap<String, String> {
    let mut index = BTreeMap::new();
    let mut meta_paths: Vec<&String> = files.iter().filter(|p| p.ends_with(".meta")).collect();
    meta_paths.sort();
    for meta_path in meta_paths {
        let Ok(content) = source.read_file(meta_path) else {
            continue;
        };
        let Some(guid) = parse_meta_guid(&content) else {
            continue;
        };
        let asset_path = meta_path.trim_end_matches(".meta").to_string();
        index.insert(guid, asset_path);
    }
    index
}
