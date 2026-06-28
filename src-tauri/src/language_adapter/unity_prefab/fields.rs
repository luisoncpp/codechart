// @Architecture(descriptionShort="Collects serialized public fields from MonoBehaviour YAML blocks")

use std::collections::BTreeSet;

const MONO_SKIP: &[&str] = &[
    "m_ObjectHideFlags",
    "m_CorrespondingSourceObject",
    "m_PrefabInstance",
    "m_PrefabAsset",
    "m_GameObject",
    "m_Enabled",
    "m_EditorHideFlags",
    "m_Script",
    "m_Name",
    "m_EditorClassIdentifier",
];

/// Custom serialized fields across every `MonoBehaviour:` document in the prefab.
pub fn serialized_fields(source: &str) -> Vec<String> {
    let mut fields = BTreeSet::new();
    let mut in_mono = false;
    for line in source.lines() {
        if line.starts_with("--- ") {
            in_mono = false;
            continue;
        }
        if line.trim_start().starts_with("MonoBehaviour:") {
            in_mono = true;
            continue;
        }
        if !in_mono {
            continue;
        }
        record_field_line(line, &mut fields);
    }
    fields.into_iter().collect()
}

fn record_field_line(line: &str, fields: &mut BTreeSet<String>) {
    let trimmed = line.trim();
    if trimmed.is_empty() || trimmed.starts_with('-') {
        return;
    }
    let Some((key, _)) = trimmed.split_once(':') else {
        return;
    };
    let key = key.trim();
    if key.starts_with("m_") || MONO_SKIP.contains(&key) {
        return;
    }
    fields.insert(key.to_string());
}
