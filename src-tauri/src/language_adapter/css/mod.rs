// @Architecture(descriptionShort="CSS stylesheet adapter")
// CSS adapter: scan @import rules for relative dependency edges.

use crate::language_adapter::adapter_types::{
    ImportKind, LanguageAdapter, ParseError, ParsedImport, ParsedModule,
};

pub struct CssAdapter;

impl CssAdapter {
    pub fn new() -> Self {
        Self
    }
}

impl LanguageAdapter for CssAdapter {
    fn parse(&self, path: &str, source: &str) -> Result<ParsedModule, ParseError> {
        Ok(ParsedModule {
            path: path.to_string(),
            imports: parse_imports(source),
            loc: loc(source),
            ..Default::default()
        })
    }
}

fn parse_imports(source: &str) -> Vec<ParsedImport> {
    let mut imports = Vec::new();
    let mut cursor = 0;
    let bytes = source.as_bytes();
    while cursor < bytes.len() {
        if let Some(next) = skip_comment(bytes, cursor) {
            cursor = next;
            continue;
        }
        if !starts_with_at_import(bytes, cursor) {
            cursor += 1;
            continue;
        }
        if let Some((specifier, next)) = read_at_import(bytes, cursor) {
            if specifier.starts_with('.') {
                imports.push(side_effect_import(specifier));
            }
            cursor = next;
            continue;
        }
        cursor += 1;
    }
    imports
}

fn side_effect_import(specifier: String) -> ParsedImport {
    ParsedImport {
        specifier,
        kind: ImportKind::SideEffect,
        names: Vec::new(),
        is_type_only: false,
        is_reexport: false,
    }
}

fn skip_comment(bytes: &[u8], start: usize) -> Option<usize> {
    if bytes.get(start..start + 2) != Some(b"/*") {
        return None;
    }
    let mut i = start + 2;
    while i + 1 < bytes.len() {
        if bytes[i] == b'*' && bytes[i + 1] == b'/' {
            return Some(i + 2);
        }
        i += 1;
    }
    None
}

fn starts_with_at_import(bytes: &[u8], start: usize) -> bool {
    bytes.get(start..start + 7) == Some(b"@import")
        && bytes
            .get(start + 7)
            .is_none_or(|b| b.is_ascii_whitespace())
}

fn read_at_import(bytes: &[u8], start: usize) -> Option<(String, usize)> {
    let mut i = start + 7;
    while bytes.get(i).is_some_and(|b| b.is_ascii_whitespace()) {
        i += 1;
    }
    if bytes.get(i..i + 4) == Some(b"url(") {
        i += 4;
        while bytes.get(i).is_some_and(|b| b.is_ascii_whitespace()) {
            i += 1;
        }
    }
    let (specifier, next) = read_quoted_or_bare(bytes, i)?;
    Some((specifier, skip_import_tail(bytes, next)))
}

fn read_quoted_or_bare(bytes: &[u8], start: usize) -> Option<(String, usize)> {
    let quote = bytes.get(start).copied().filter(|&b| b == b'"' || b == b'\'');
    if let Some(q) = quote {
        let mut i = start + 1;
        let mut out = String::new();
        while let Some(&b) = bytes.get(i) {
            if b == q {
                return Some((out, i + 1));
            }
            out.push(b as char);
            i += 1;
        }
        return None;
    }
    let mut i = start;
    let mut out = String::new();
    while let Some(&b) = bytes.get(i) {
        if b.is_ascii_whitespace() || b == b';' || b == b')' {
            break;
        }
        out.push(b as char);
        i += 1;
    }
    if out.is_empty() {
        None
    } else {
        Some((out, i))
    }
}

fn skip_import_tail(bytes: &[u8], mut i: usize) -> usize {
    while i < bytes.len() {
        if bytes[i] == b';' {
            return i + 1;
        }
        if let Some(next) = skip_comment(bytes, i) {
            i = next;
            continue;
        }
        i += 1;
    }
    bytes.len()
}

fn loc(source: &str) -> u32 {
    if source.is_empty() {
        return 0;
    }
    source.lines().count() as u32
}

#[cfg(test)]
mod tests;
