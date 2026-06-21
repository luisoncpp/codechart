// Language adapters: parse one source file into local facts (Phase 2).
//
// Public surface: the `LanguageAdapter` trait, the `ParsedModule` data it
// produces, and `registry_for(ext)` which picks an adapter by file extension.
// The concrete TypeScript implementation stays private behind this boundary.

mod typescript;

/// How a dependency specifier is brought into a module.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ImportKind {
    /// `import X from "m"`
    Default,
    /// `import { a, b } from "m"`
    Named,
    /// `import * as ns from "m"`
    Namespace,
    /// `import "m"` (run for side effects only)
    SideEffect,
}

/// One dependency edge candidate extracted from a file: an `import` or a
/// re-export (`export ... from "m"`). The resolver (Phase 4) turns the
/// `specifier` into a module id.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParsedImport {
    /// The raw module specifier, e.g. `"./todo"` or `"react"`.
    pub specifier: String,
    pub kind: ImportKind,
    /// Imported / re-exported symbol names (empty for namespace/side-effect).
    pub names: Vec<String>,
    /// `import type` / `export type` — a types-only dependency.
    pub is_type_only: bool,
    /// `export ... from "m"` rather than `import ... from "m"`.
    pub is_reexport: bool,
}

/// A raw comment block with its byte range in the source (for §8 L2 and
/// `semantic_comments` annotation parsing).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CommentBlock {
    pub text: String,
    pub start_byte: usize,
    pub end_byte: usize,
}

/// Whether a communication call emits an event or listens for one.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SignalRole {
    Emit,
    Listen,
}

/// A dynamic-communication signal: an event emit/listen keyed by its string
/// token (Phase 9). The soft-edge classifier pairs emitters to listeners that
/// share a `token` — a runtime relationship imports can't see (TDD §2.4).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CommSignal {
    pub role: SignalRole,
    pub token: String,
}

/// Local facts extracted from a single source file. Pure data — no resolution
/// against other files happens here.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct ParsedModule {
    /// Repo-relative POSIX path of the file (passed in by the caller).
    pub path: String,
    /// `import ... from "m"` and bare side-effect imports.
    pub imports: Vec<ParsedImport>,
    /// `export ... from "m"` re-exports (also dependency edges).
    pub reexports: Vec<ParsedImport>,
    /// Names this module exports (local declarations + re-exported names).
    pub exported_symbols: Vec<String>,
    /// Raw comment blocks, in source order.
    pub comments: Vec<CommentBlock>,
    /// Event emit/listen signals, in source order (Phase 9 soft edges).
    pub signals: Vec<CommSignal>,
    /// Lines of code (newline count + 1 for non-empty files).
    pub loc: u32,
}

#[derive(Debug, thiserror::Error)]
pub enum ParseError {
    #[error("failed to set tree-sitter language: {0}")]
    Language(String),
    #[error("tree-sitter produced no tree")]
    NoTree,
}

/// Parse one file's source into a [`ParsedModule`]. The `path` is recorded
/// verbatim onto the result so callers stay in control of id derivation.
pub trait LanguageAdapter: Send + Sync {
    fn parse(&self, path: &str, source: &str) -> Result<ParsedModule, ParseError>;
}

/// Pick an adapter for a file extension (no leading dot), or `None` if the
/// extension is unsupported. Extensions are matched case-sensitively.
pub fn registry_for(ext: &str) -> Option<Box<dyn LanguageAdapter>> {
    match ext {
        "ts" | "tsx" | "mts" | "cts" => {
            Some(Box::new(typescript::TypeScriptAdapter::new(ext == "tsx")))
        }
        _ => None,
    }
}

/// Convenience: pick an adapter from a path's extension.
pub fn registry_for_path(path: &str) -> Option<Box<dyn LanguageAdapter>> {
    let ext = path.rsplit('.').next().filter(|e| *e != path)?;
    registry_for(ext)
}
