// @Architecture(descriptionShort="C++ adapter: tree-sitter walk → ParsedModule")

mod extract;
mod implements;
mod include;

use tree_sitter::Parser;

use crate::language_adapter::adapter_types::{LanguageAdapter, ParseError, ParsedModule};

pub struct CppAdapter;

impl CppAdapter {
    pub fn new() -> Self {
        Self
    }
}

impl LanguageAdapter for CppAdapter {
    fn parse(&self, path: &str, source: &str) -> Result<ParsedModule, ParseError> {
        let mut parser = Parser::new();
        parser
            .set_language(&tree_sitter_cpp::LANGUAGE.into())
            .map_err(|e| ParseError::Language(e.to_string()))?;
        let tree = parser.parse(source, None).ok_or(ParseError::NoTree)?;

        let mut module = ParsedModule {
            path: path.to_string(),
            loc: loc(source),
            ..Default::default()
        };
        let root = tree.root_node();
        extract::walk_translation_unit(root, source, &mut module);
        module.implements = implements::collect_implements(root, source);
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
