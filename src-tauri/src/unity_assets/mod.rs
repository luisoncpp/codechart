// @Architecture(descriptionShort="Unity asset helpers: meta guid index for prefab resolution")
// unity_assets — index `.meta` guids so prefab YAML refs resolve to repo paths.
// Prefab parsing lives in `language_adapter/unity_prefab`; edge emission in
// `references::unity`.

mod meta;

#[cfg(test)]
mod tests;

pub use meta::{index_meta_files, parse_meta_guid};
