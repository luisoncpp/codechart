use super::fields::serialized_fields;
use super::guid::{asset_ref_guids, script_guids};

const SAMPLE: &str = r#"%YAML 1.1
%TAG !u! tag:unity3d.com,2011:
--- !u!114 &100
MonoBehaviour:
  m_ObjectHideFlags: 0
  m_Script: {fileID: 11500000, guid: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa, type: 3}
  m_Name:
  speed: 5
  weaponPrefab: {fileID: 100100000, guid: bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb, type: 3}
--- !u!1001 &200
PrefabInstance:
  m_SourcePrefab: {fileID: 100100000, guid: cccccccccccccccccccccccccccccccc, type: 3}
"#;

#[test]
fn extracts_script_and_prefab_guids() {
    assert_eq!(
        script_guids(SAMPLE),
        vec!["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"]
    );
    let assets = asset_ref_guids(SAMPLE);
    assert!(assets.contains(&"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb".to_string()));
    assert!(assets.contains(&"cccccccccccccccccccccccccccccccc".to_string()));
}

#[test]
fn extracts_serialized_public_fields() {
    assert_eq!(serialized_fields(SAMPLE), vec!["speed", "weaponPrefab"]);
}

#[test]
fn adapter_rejects_binary_prefab() {
    use crate::language_adapter::adapter_types::{LanguageAdapter, ParseError};
    use super::UnityPrefabAdapter;
    let err = UnityPrefabAdapter::new()
        .parse("x.prefab", "binary blob")
        .expect_err("non-yaml fails");
    assert!(matches!(err, ParseError::Language(_)));
}
