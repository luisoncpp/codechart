// @Architecture(...) comment-block parser (Phase 2).
//
// Scans arbitrary text for `@Architecture(key=value, key="quoted value", ...)`
// blocks and maps the recognized keys onto an `Annotation`. Unknown keys are
// ignored; malformed blocks degrade gracefully (best-effort, never panics).

use crate::contract::types::Annotation;

/// Parse every `@Architecture(...)` block found in `text` into an `Annotation`.
/// Multiple blocks yield multiple annotations, in source order.
pub fn parse_annotations(text: &str) -> Vec<Annotation> {
    let mut out = Vec::new();
    let mut rest = text;
    while let Some(start) = rest.find("@Architecture") {
        let after = &rest[start + "@Architecture".len()..];
        let Some(body) = balanced_parens(after) else {
            break; // unterminated `(` — stop scanning
        };
        if let Some(annotation) = annotation_from_pairs(body) {
            out.push(annotation);
        }
        let consumed = start + "@Architecture".len() + body.len() + 2;
        rest = &rest[consumed.min(rest.len())..];
    }
    out
}

/// If `s` begins (after optional whitespace) with `(`, return the slice between
/// the matching parens. Returns `None` if there is no opening/closing paren.
fn balanced_parens(s: &str) -> Option<&str> {
    let open = s.find('(')?;
    let inner = &s[open + 1..];
    let close = inner.find(')')?;
    Some(&inner[..close])
}

fn annotation_from_pairs(body: &str) -> Option<Annotation> {
    let mut annotation = Annotation::default();
    let mut found_any = false;
    for (key, value) in split_pairs(body) {
        found_any = true;
        assign(&mut annotation, &key, value);
    }
    found_any.then_some(annotation)
}

fn assign(annotation: &mut Annotation, key: &str, value: String) {
    match key {
        "type" => annotation.type_name = Some(value),
        "group" => annotation.group = Some(value),
        "descriptionShort" => annotation.description_short = Some(value),
        "descriptionLong" => annotation.description_long = Some(value),
        "icon" => annotation.icon = Some(value),
        _ => {} // unknown key — ignored
    }
}

/// Split a body into `key, value` pairs, honoring quotes so commas inside a
/// quoted value don't split it. Entries without `=` are skipped (partial block).
fn split_pairs(body: &str) -> Vec<(String, String)> {
    let mut pairs = Vec::new();
    for segment in split_top_level_commas(body) {
        let Some((key, value)) = segment.split_once('=') else {
            continue;
        };
        let key = key.trim().to_string();
        if key.is_empty() {
            continue;
        }
        pairs.push((key, unquote(value.trim())));
    }
    pairs
}

fn split_top_level_commas(body: &str) -> Vec<String> {
    let mut segments = Vec::new();
    let mut current = String::new();
    let mut in_quote: Option<char> = None;
    for ch in body.chars() {
        match (in_quote, ch) {
            (Some(q), c) if c == q => in_quote = None,
            (None, '"' | '\'') => in_quote = Some(ch),
            (None, ',') => {
                segments.push(std::mem::take(&mut current));
                continue;
            }
            _ => {}
        }
        current.push(ch);
    }
    segments.push(current);
    segments
}

fn unquote(value: &str) -> String {
    let trimmed = value.trim();
    let bytes = trimmed.as_bytes();
    if bytes.len() >= 2 && (bytes[0] == b'"' || bytes[0] == b'\'') && bytes[bytes.len() - 1] == bytes[0]
    {
        return trimmed[1..trimmed.len() - 1].to_string();
    }
    trimmed.to_string()
}

#[cfg(test)]
mod tests;
