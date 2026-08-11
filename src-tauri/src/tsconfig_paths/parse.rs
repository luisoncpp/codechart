// @Architecture(descriptionShort="Parses tsconfig/jsconfig compilerOptions.paths")

use serde::Deserialize;
use std::collections::BTreeMap;

use super::PathAliases;

#[derive(Debug, Deserialize)]
struct TsConfig {
    #[serde(default, rename = "compilerOptions")]
    compiler_options: CompilerOptions,
}

#[derive(Debug, Default, Deserialize)]
struct CompilerOptions {
    #[serde(default, rename = "baseUrl")]
    base_url: Option<String>,
    #[serde(default)]
    paths: BTreeMap<String, Vec<String>>,
}

/// Parse a tsconfig/jsconfig JSON string into path aliases.
pub fn parse_config(content: &str, config_dir: &str) -> PathAliases {
    let stripped = strip_json_comments(content);
    let config: TsConfig = match serde_json::from_str(&stripped) {
        Ok(config) => config,
        Err(_) => return PathAliases::default(),
    };
    let base_url = config
        .compiler_options
        .base_url
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| ".".to_string());
    let mappings = config
        .compiler_options
        .paths
        .into_iter()
        .filter_map(|(pattern, targets)| {
            let target = targets.into_iter().find(|t| !t.is_empty())?;
            Some((pattern, target))
        })
        .collect();
    PathAliases {
        config_dir: config_dir.to_string(),
        base_url,
        mappings,
    }
}

/// Strip `//` and `/* */` comments so serde_json can read tsconfig files.
fn strip_json_comments(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    let mut chars = input.chars().peekable();
    let mut in_string = false;
    let mut escape = false;
    while let Some(ch) = chars.next() {
        if in_string {
            out.push(ch);
            if escape {
                escape = false;
                continue;
            }
            if ch == '\\' {
                escape = true;
            } else if ch == '"' {
                in_string = false;
            }
            continue;
        }
        if ch == '"' {
            in_string = true;
            out.push(ch);
            continue;
        }
        if ch == '/' {
            match chars.peek() {
                Some('/') => {
                    chars.next();
                    while matches!(chars.peek(), Some(c) if *c != '\n') {
                        chars.next();
                    }
                    continue;
                }
                Some('*') => {
                    chars.next();
                    while let Some(next) = chars.next() {
                        if next == '*' && matches!(chars.peek(), Some('/')) {
                            chars.next();
                            break;
                        }
                    }
                    continue;
                }
                _ => {}
            }
        }
        out.push(ch);
    }
    out
}
