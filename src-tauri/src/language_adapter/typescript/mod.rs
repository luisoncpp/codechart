// @Architecture(descriptionShort="TypeScript/TSX tree-sitter adapter")
// TypeScript/TSX adapter (Phase 2): tree-sitter walk → ParsedModule.

mod extract;
mod implements;
mod ipc;
mod signals;

use tree_sitter::Parser;

use crate::language_adapter::adapter_types::{LanguageAdapter, ParseError, ParsedModule};

pub struct TypeScriptAdapter {
    is_tsx: bool,
}

impl TypeScriptAdapter {
    pub fn new(is_tsx: bool) -> Self {
        Self { is_tsx }
    }

    fn language(&self) -> tree_sitter::Language {
        if self.is_tsx {
            tree_sitter_typescript::LANGUAGE_TSX.into()
        } else {
            tree_sitter_typescript::LANGUAGE_TYPESCRIPT.into()
        }
    }
}

impl LanguageAdapter for TypeScriptAdapter {
    fn parse(&self, path: &str, source: &str) -> Result<ParsedModule, ParseError> {
        let mut parser = Parser::new();
        parser
            .set_language(&self.language())
            .map_err(|e| ParseError::Language(e.to_string()))?;
        let tree = parser.parse(source, None).ok_or(ParseError::NoTree)?;

        let mut module = ParsedModule {
            path: path.to_string(),
            loc: loc(source),
            ..Default::default()
        };
        extract::walk_top_level(tree.root_node(), source, &mut module);
        module.signals = signals::collect_signals(tree.root_node(), source);
        module.implements = implements::collect_implements(tree.root_node(), source);
        module.ipc_invokes =
            ipc::collect_ipc_invokes(tree.root_node(), source, &module.imports);
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
