// Rust adapter (Phase 2): tree-sitter walk → ParsedModule.

mod extract;
mod locate;
mod path;

use tree_sitter::Parser;

use super::{LanguageAdapter, ParseError, ParsedModule};

pub struct RustAdapter;

impl RustAdapter {
    pub fn new() -> Self {
        Self
    }
}

impl LanguageAdapter for RustAdapter {
    fn parse(&self, path: &str, source: &str) -> Result<ParsedModule, ParseError> {
        let mut parser = Parser::new();
        parser
            .set_language(&tree_sitter_rust::LANGUAGE.into())
            .map_err(|e| ParseError::Language(e.to_string()))?;
        let tree = parser.parse(source, None).ok_or(ParseError::NoTree)?;

        let mut module = ParsedModule {
            path: path.to_string(),
            loc: loc(source),
            ..Default::default()
        };
        extract::walk_top_level(tree.root_node(), source, &mut module);
        Ok(module)
    }
}

fn loc(source: &str) -> u32 {
    if source.is_empty() {
        return 0;
    }
    source.lines().count() as u32
}

#[cfg(test)]
mod tests;
