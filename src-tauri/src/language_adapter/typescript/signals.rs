// @Architecture(descriptionShort="Extracts emit/listen event signals from TypeScript call expressions")

use tree_sitter::Node;

use crate::language_adapter::{CommSignal, SignalRole};

/// Callee names that publish an event.
const EMIT: [&str; 4] = ["emit", "dispatch", "publish", "send"];
/// Callee names that subscribe to an event.
const LISTEN: [&str; 4] = ["on", "addEventListener", "subscribe", "addListener"];

/// Collect every emit/listen signal in the tree, in source order.
pub fn collect_signals(root: Node, src: &str) -> Vec<CommSignal> {
    let mut signals = Vec::new();
    walk(root, src, &mut signals);
    signals
}

fn walk(node: Node, src: &str, signals: &mut Vec<CommSignal>) {
    if node.kind() == "call_expression" {
        if let Some(signal) = signal_of(node, src) {
            signals.push(signal);
        }
    }
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        walk(child, src, signals);
    }
}

/// A signal for `call_expression` whose callee is in an allowlist and whose
/// first argument is a string literal, else `None`.
fn signal_of(call: Node, src: &str) -> Option<CommSignal> {
    let role = role_of(callee_name(call, src)?)?;
    let token = first_string_arg(call, src)?;
    Some(CommSignal { role, token })
}

/// The called method/function name: a bare `identifier` callee, or the
/// `property` of a `member_expression` callee (`bus.emit(...)`).
fn callee_name<'a>(call: Node, src: &'a str) -> Option<&'a str> {
    let function = call.child_by_field_name("function")?;
    match function.kind() {
        "identifier" => Some(text_of(function, src)),
        "member_expression" => Some(text_of(function.child_by_field_name("property")?, src)),
        _ => None,
    }
}

fn role_of(name: &str) -> Option<SignalRole> {
    if EMIT.contains(&name) {
        return Some(SignalRole::Emit);
    }
    if LISTEN.contains(&name) {
        return Some(SignalRole::Listen);
    }
    None
}

/// The unquoted token from the call's first argument when it is a string literal.
fn first_string_arg(call: Node, src: &str) -> Option<String> {
    let args = call.child_by_field_name("arguments")?;
    let mut cursor = args.walk();
    let first = args.children(&mut cursor).find(|c| c.kind() != "(")?;
    if first.kind() != "string" {
        return None;
    }
    Some(text_of(first, src).trim_matches(['"', '\'', '`']).to_string())
}

fn text_of<'a>(node: Node, src: &'a str) -> &'a str {
    node.utf8_text(src.as_bytes()).unwrap_or("")
}
