use crate::project_source::MemoryProjectSource;
use std::collections::HashMap;

use super::parse_meta_guid;

#[test]
fn parses_guid_from_meta_body() {
    let meta = "fileFormatVersion: 2\nguid: AbCdEf0123456789AbCdEf0123456789\n";
    assert_eq!(
        parse_meta_guid(meta),
        Some("abcdef0123456789abcdef0123456789".into())
    );
}

#[test]
fn index_meta_maps_guid_to_asset_path() {
    use crate::unity_assets::index_meta_files;
    let files = [
        "Assets/Foo.cs.meta".to_string(),
        "Assets/Bar.prefab.meta".to_string(),
    ];
    let mut map = HashMap::new();
    map.insert(
        "Assets/Foo.cs.meta".into(),
        "fileFormatVersion: 2\nguid: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n".into(),
    );
    map.insert(
        "Assets/Bar.prefab.meta".into(),
        "fileFormatVersion: 2\nguid: bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\n".into(),
    );
    let source = MemoryProjectSource::new(map);
    let index = index_meta_files(&source, &files);
    assert_eq!(
        index.get("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"),
        Some(&"Assets/Foo.cs".to_string())
    );
    assert_eq!(
        index.get("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"),
        Some(&"Assets/Bar.prefab".to_string())
    );
}
