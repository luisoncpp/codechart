// @Architecture(descriptionShort="Resolves C++ includes through Unreal include roots")

use std::collections::BTreeSet;

use crate::language_adapter::ParsedImport;
use crate::unreal_config::UnrealOptions;

use super::resolve::{resolve_path, resolve_relative};

pub fn is_cpp_path(path: &str) -> bool {
    path.ends_with(".cpp")
        || path.ends_with(".cc")
        || path.ends_with(".cxx")
        || path.ends_with(".h")
        || path.ends_with(".hpp")
        || path.ends_with(".hxx")
}

pub fn resolve_cpp_import(
    importer: &str,
    import: &ParsedImport,
    known: &BTreeSet<&str>,
    options: &UnrealOptions,
) -> CppResolution {
    if let Some(target) = resolve_relative(importer, &import.specifier, known, /*item_fallback=*/false)
    {
        return CppResolution::Resolved(target);
    }
    let include = include_text(&import.specifier);
    if let Some(target) = resolve_from_roots(include, known, &options.known_paths) {
        return CppResolution::Resolved(target);
    }
    if options.exclude_engine_references && is_engine_include(include) {
        return CppResolution::External;
    }
    CppResolution::Unresolved
}

pub enum CppResolution {
    Resolved(String),
    External,
    Unresolved,
}

fn resolve_from_roots(
    include: &str,
    known: &BTreeSet<&str>,
    roots: &[String],
) -> Option<String> {
    roots
        .iter()
        .map(|root| format!("{}/{}", root.trim_matches('/'), include))
        .find_map(|candidate| resolve_path(&candidate, known))
}

fn include_text(specifier: &str) -> &str {
    specifier.strip_prefix("./").unwrap_or(specifier)
}

fn is_engine_include(include: &str) -> bool {
    if ENGINE_ROOT_HEADERS.contains(&include) {
        return true;
    }
    ENGINE_PREFIXES.iter().any(|p| include.starts_with(p))
}

const ENGINE_ROOT_HEADERS: &[&str] = &[
    "CoreMinimal.h",
    "CoreTypes.h",
    "EngineMinimal.h",
    "Modules/ModuleManager.h",
];

const ENGINE_PREFIXES: &[&str] = &[
    "Blueprint/",
    "Components/",
    "Containers/",
    "Delegates/",
    "Engine/",
    "GameFramework/",
    "HAL/",
    "Internationalization/",
    "Kismet/",
    "Math/",
    "Misc/",
    "Modules/",
    "Templates/",
    "UObject/",
];
