// @Architecture(descriptionShort="Picks a LanguageAdapter by file extension")

use crate::language_adapter::adapter_types::LanguageAdapter;
use super::{csharp, css, rust, typescript, unity_prefab};

/// Pick an adapter for a file extension (no leading dot), or `None` if the
/// extension is unsupported. Extensions are matched case-sensitively.
pub fn registry_for(ext: &str) -> Option<Box<dyn LanguageAdapter>> {
    match ext {
        "ts" | "tsx" | "mts" | "cts" => {
            Some(Box::new(typescript::TypeScriptAdapter::new(ext == "tsx")))
        }
        "rs" => Some(Box::new(rust::RustAdapter::new())),
        "cs" => Some(Box::new(csharp::CSharpAdapter::new())),
        "prefab" => Some(Box::new(unity_prefab::UnityPrefabAdapter::new())),
        "css" => Some(Box::new(css::CssAdapter::new())),
        _ => None,
    }
}

/// Convenience: pick an adapter from a path's extension.
pub fn registry_for_path(path: &str) -> Option<Box<dyn LanguageAdapter>> {
    let ext = path.rsplit('.').next().filter(|e| *e != path)?;
    registry_for(ext)
}

#[cfg(test)]
mod tests {
    use super::{registry_for, registry_for_path};

    #[test]
    fn picks_typescript_adapters() {
        assert!(registry_for("ts").is_some());
        assert!(registry_for("tsx").is_some());
    }

    #[test]
    fn picks_rust_adapter() {
        assert!(registry_for_path("main.rs").is_some());
    }

    #[test]
    fn picks_csharp_adapter() {
        assert!(registry_for_path("Program.cs").is_some());
    }

    #[test]
    fn picks_prefab_adapter() {
        assert!(registry_for("prefab").is_some());
    }

    #[test]
    fn picks_css_adapter() {
        assert!(registry_for_path("graph-canvas.css").is_some());
    }

    #[test]
    fn unsupported_extensions_return_none() {
        assert!(registry_for("cpp").is_none());
        assert!(registry_for_path("a.cpp").is_none());
        assert!(registry_for_path("noext").is_none());
    }
}
