// @Architecture(descriptionShort="Loads tsconfig paths and maps @ import aliases")
// tsconfig_paths — read `compilerOptions.paths` from tsconfig/jsconfig and map
// `@/…` style import specifiers to repo-relative module paths for the resolver.

mod match_alias;
mod parse;

#[cfg(test)]
mod tests;

use crate::project_source::ProjectSource;

pub use match_alias::mapped_path;
pub use parse::parse_config;

const TSCONFIG: &str = "tsconfig.json";
const JSCONFIG: &str = "jsconfig.json";

/// Parsed `compilerOptions.baseUrl` + `paths` from a project config file.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct PathAliases {
    /// Repo-relative directory of the config file (`""` = project root).
    pub config_dir: String,
    /// `compilerOptions.baseUrl`, relative to `config_dir`.
    pub base_url: String,
    /// `compilerOptions.paths` entries in source order.
    pub mappings: Vec<(String, String)>,
}

/// Load path aliases from `tsconfig.json` or `jsconfig.json` at the project root.
pub fn load_from_source(source: &dyn ProjectSource) -> PathAliases {
    for path in [TSCONFIG, JSCONFIG] {
        if let Ok(content) = source.read_file(path) {
            return parse_config(&content, "");
        }
    }
    PathAliases::default()
}
