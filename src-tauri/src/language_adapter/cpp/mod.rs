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
        let parse_source = mask_unreal_syntax(source);
        let tree = parser
            .parse(&parse_source, None)
            .ok_or(ParseError::NoTree)?;

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

fn mask_unreal_syntax(source: &str) -> String {
    let without_api_macros = mask_unreal_api_macros(source);
    mask_unreal_generated_body_macros(&without_api_macros)
}

fn mask_unreal_api_macros(source: &str) -> String {
    let pattern = regex::Regex::new(r"\b(class|struct)(\s+)([A-Z][A-Z0-9_]*_API)(\s+)")
        .expect("static Unreal API macro regex");
    pattern
        .replace_all(source, |captures: &regex::Captures| {
            let padding = " ".repeat(captures[3].len());
            format!(
                "{}{}{}{}",
                &captures[1], &captures[2], padding, &captures[4]
            )
        })
        .into_owned()
}

fn mask_unreal_generated_body_macros(source: &str) -> String {
    let pattern = regex::Regex::new(
        r"\bGENERATED_(?:BODY|UCLASS_BODY|USTRUCT_BODY|IINTERFACE_BODY|UINTERFACE_BODY)[ \t]*\([ \t]*\)",
    )
    .expect("static Unreal generated-body macro regex");
    pattern
        .replace_all(source, |captures: &regex::Captures| {
            " ".repeat(captures[0].len())
        })
        .into_owned()
}

fn loc(source: &str) -> u32 {
    if source.is_empty() {
        return 0;
    }
    source.lines().count() as u32
}

#[cfg(test)]
mod tests;
