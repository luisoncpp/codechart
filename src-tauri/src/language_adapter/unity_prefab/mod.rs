// @Architecture(descriptionShort="Unity prefab YAML adapter")
// Unity prefab adapter: scan YAML for script/prefab guids and serialized fields.

mod fields;
mod guid;

use super::{LanguageAdapter, ParseError, ParsedModule};

pub struct UnityPrefabAdapter;

impl UnityPrefabAdapter {
    pub fn new() -> Self {
        Self
    }
}

impl LanguageAdapter for UnityPrefabAdapter {
    fn parse(&self, path: &str, source: &str) -> Result<ParsedModule, ParseError> {
        if !source.starts_with("%YAML") {
            return Err(ParseError::Language(
                "prefab is not text-serialized YAML".into(),
            ));
        }
        Ok(ParsedModule {
            path: path.to_string(),
            exported_symbols: fields::serialized_fields(source),
            unity_script_guids: guid::script_guids(source),
            unity_asset_guids: guid::asset_ref_guids(source),
            loc: loc(source),
            ..Default::default()
        })
    }
}

fn loc(source: &str) -> u32 {
    if source.is_empty() {
        return 0;
    }
    source.lines().count() as u32
}

#[cfg(test)]
mod tests;
