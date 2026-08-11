use super::{mapped_path, parse_config, PathAliases};

#[test]
fn parses_paths_and_base_url() {
    let json = r#"{
      "compilerOptions": {
        "baseUrl": ".",
        "paths": { "@/*": ["./src/*"] }
      }
    }"#;
    let aliases = parse_config(json, "");
    assert_eq!(aliases.base_url, ".");
    assert_eq!(aliases.mappings, vec![("@/*".to_string(), "./src/*".to_string())]);
}

#[test]
fn maps_at_slash_alias_to_src() {
    let aliases = PathAliases {
        config_dir: String::new(),
        base_url: ".".to_string(),
        mappings: vec![("@/*".to_string(), "./src/*".to_string())],
    };
    assert_eq!(
        mapped_path(&aliases, "@/core/store"),
        Some("src/core/store".to_string())
    );
}

#[test]
fn scoped_package_imports_do_not_match_at_slash() {
    let aliases = PathAliases {
        config_dir: String::new(),
        base_url: ".".to_string(),
        mappings: vec![("@/*".to_string(), "./src/*".to_string())],
    };
    assert_eq!(mapped_path(&aliases, "@tauri-apps/api/core"), None);
}

#[test]
fn strips_json_comments() {
    let json = r#"{
      // line comment
      "compilerOptions": {
        "paths": { "@/*": ["src/*"] } /* block */
      }
    }"#;
    let aliases = parse_config(json, "");
    assert_eq!(mapped_path(&aliases, "@/a"), Some("src/a".to_string()));
}
