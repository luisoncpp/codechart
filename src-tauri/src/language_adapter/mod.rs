// @Architecture(descriptionShort="LanguageAdapter seam: one source file to ParsedModule")
// Language adapters: parse one source file into local facts (Phase 2).
//
// Public surface: the `LanguageAdapter` trait, the `ParsedModule` data it
// produces, and `registry_for(ext)` which picks an adapter by file extension.
// Concrete implementations stay private behind this boundary.

mod adapter_types;
mod cpp;
mod csharp;
mod css;
mod registry;
mod rust;
mod typescript;
mod unity_prefab;

pub use adapter_types::{
    CommSignal, CommentBlock, ImportKind, LanguageAdapter, ParseError, ParsedImport, ParsedModule,
    SignalRole,
};
pub use registry::{registry_for, registry_for_path};
