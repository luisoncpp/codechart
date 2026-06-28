// @Architecture(descriptionShort="Extracts Unity YAML guid references from prefab text")

use std::collections::BTreeSet;

/// Pull every `guid:` hex token from a Unity YAML reference line.
pub fn guid_on_line(line: &str) -> Option<String> {
    let idx = line.find("guid:")?;
    let rest = &line[idx + 5..];
    let guid: String = rest
        .trim()
        .chars()
        .take_while(|c| c.is_ascii_hexdigit())
        .collect();
    if guid.len() == 32 {
        Some(guid.to_lowercase())
    } else {
        None
    }
}

/// `m_Script` lines reference C# MonoScripts by guid.
pub fn script_guids(source: &str) -> Vec<String> {
    let mut seen = BTreeSet::new();
    for line in source.lines() {
        if !line.trim_start().starts_with("m_Script:") {
            continue;
        }
        if let Some(guid) = guid_on_line(line) {
            seen.insert(guid);
        }
    }
    seen.into_iter().collect()
}

/// Non-script guid refs (nested prefabs, serialized prefab fields, etc.).
pub fn asset_ref_guids(source: &str) -> Vec<String> {
    let mut seen = BTreeSet::new();
    for line in source.lines() {
        if line.trim_start().starts_with("m_Script:") {
            continue;
        }
        if !line.contains("guid:") {
            continue;
        }
        if let Some(guid) = guid_on_line(line) {
            seen.insert(guid);
        }
    }
    seen.into_iter().collect()
}
