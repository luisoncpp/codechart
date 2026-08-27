// @Architecture(descriptionShort="Resolves C++ includes through Unreal include roots")

use std::collections::BTreeSet;

use crate::language_adapter::ParsedImport;
use crate::UnrealOptions;

use super::resolve::{is_relative, resolve_path, resolve_relative};

pub fn is_cpp_impl(path: &str) -> bool {
    path.ends_with(".cpp") || path.ends_with(".cc") || path.ends_with(".cxx")
}

pub fn is_cpp_header(path: &str) -> bool {
    path.ends_with(".h") || path.ends_with(".hpp") || path.ends_with(".hxx")
}

pub fn file_stem(path: &str) -> &str {
    basename(path).split('.').next().unwrap_or(path)
}

pub fn is_paired_cpp_header(impl_path: &str, header_path: &str) -> bool {
    is_cpp_impl(impl_path) && is_cpp_header(header_path) && file_stem(impl_path) == file_stem(header_path)
}

/// Path shown in cycle diagnostics — C++ units drop `.h`/`.cpp`/… so the logical unit is clear.
pub fn display_cycle_unit(path: &str) -> String {
    for ext in [".cpp", ".cxx", ".cc", ".hpp", ".hxx", ".h"] {
        if let Some(stem) = path.strip_suffix(ext) {
            return stem.to_string();
        }
    }
    path.to_string()
}

fn basename(path: &str) -> &str {
    path.rsplit('/').next().unwrap_or(path)
}

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
    if let Some(target) = resolve_relative(
        importer,
        &import.specifier,
        known,
        /*item_fallback=*/ false,
    ) {
        return CppResolution::Resolved(target);
    }
    let include = include_text(&import.specifier);
    if let Some(target) = resolve_from_roots(include, known, &options.known_paths) {
        return CppResolution::Resolved(target);
    }
    if options.hide_generated_files && is_generated_include(include) {
        return CppResolution::External;
    }
    if options.exclude_engine_references && is_engine_include(include) {
        return CppResolution::External;
    }
    if !is_relative(&import.specifier) {
        return CppResolution::External;
    }
    CppResolution::Unresolved
}

pub enum CppResolution {
    Resolved(String),
    External,
    Unresolved,
}

fn resolve_from_roots(include: &str, known: &BTreeSet<&str>, roots: &[String]) -> Option<String> {
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

fn is_generated_include(include: &str) -> bool {
    include.ends_with(".generated.h") || include.ends_with(".gen.cpp")
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
