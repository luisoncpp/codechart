use super::parse_annotations;

#[test]
fn parses_full_block() {
    let text = r#"// @Architecture(type=Module, group=services, descriptionShort="HTTP transport", descriptionLong="Single choke point for network access; services depend on this, not fetch.", icon="globe")"#;
    let anns = parse_annotations(text);
    assert_eq!(anns.len(), 1);
    let a = &anns[0];
    assert_eq!(a.type_name.as_deref(), Some("Module"));
    assert_eq!(a.group.as_deref(), Some("services"));
    assert_eq!(a.description_short.as_deref(), Some("HTTP transport"));
    assert_eq!(
        a.description_long.as_deref(),
        Some("Single choke point for network access; services depend on this, not fetch.")
    );
    assert_eq!(a.icon.as_deref(), Some("globe"));
}

#[test]
fn quoted_value_with_comma_not_split() {
    let anns = parse_annotations(r#"@Architecture(descriptionShort="a, b, c")"#);
    assert_eq!(anns[0].description_short.as_deref(), Some("a, b, c"));
}

#[test]
fn partial_block_only_some_keys() {
    let anns = parse_annotations("@Architecture(type=Facade)");
    assert_eq!(anns[0].type_name.as_deref(), Some("Facade"));
    assert!(anns[0].group.is_none());
}

#[test]
fn unknown_keys_ignored() {
    let anns = parse_annotations("@Architecture(type=Module, color=red, foo=bar)");
    assert_eq!(anns[0].type_name.as_deref(), Some("Module"));
}

#[test]
fn no_block_yields_empty() {
    assert!(parse_annotations("// just a normal comment").is_empty());
}

#[test]
fn unterminated_parens_does_not_panic() {
    assert!(parse_annotations("@Architecture(type=Module").is_empty());
}

#[test]
fn empty_block_yields_no_annotation() {
    assert!(parse_annotations("@Architecture()").is_empty());
}

#[test]
fn multiple_blocks() {
    let text = "@Architecture(type=A)\n@Architecture(type=B)";
    let anns = parse_annotations(text);
    assert_eq!(anns.len(), 2);
    assert_eq!(anns[0].type_name.as_deref(), Some("A"));
    assert_eq!(anns[1].type_name.as_deref(), Some("B"));
}
