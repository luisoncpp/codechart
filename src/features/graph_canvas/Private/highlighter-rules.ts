// @Architecture(descriptionShort="Shared syntax-highlighting rule fragments for highlighter.ts")
import type { Rule } from "./highlighter";

export const BASIC_TYPE_RULE: Rule = {
  type: "type",
  regex: /^\b([A-Z][a-zA-Z0-9_]*)\b/,
};

export const BASIC_FUNCTION_RULE: Rule = {
  type: "function",
  regex: /^\b([a-zA-Z_][a-zA-Z0-9_]*)(?=\s*\()/,
};

export const CPP_FUNCTION_RULE: Rule = {
  type: "function",
  regex: /^\b([a-zA-Z_~][a-zA-Z0-9_]*)(?=\s*\()/,
};

export const STANDARD_OPERATOR_RULE: Rule = {
  type: "operator",
  regex: /^(===|==|!==|!=|=>|\+\+|--|\+=|-=|\*=|\/=|&&|\|\||[+\-*/%&|^!~=<>?:])/,
};

export const PYTHON_OPERATOR_RULE: Rule = {
  type: "operator",
  regex: /^(\+=|-=|\*=|\/=|&&|\|\||[+\-*/%&|^!~=<>?:])/,
};

export const GO_OPERATOR_RULE: Rule = {
  type: "operator",
  regex: /^(:=|=>|->|\+\+|--|\+=|-=|\*=|\/=|&&|\|\||[+\-*/%&|^!~=<>?:])/,
};

export const RUST_OPERATOR_RULE: Rule = {
  type: "operator",
  regex: /^(===|==|!==|!=|=>|->|\+\+|--|\+=|-=|\*=|\/=|&&|\|\||[+\-*/%&|^!~=<>?:])/,
};

export const CPP_OPERATOR_RULE: Rule = {
  type: "operator",
  regex: /^(===|==|!==|!=|=>|\+\+|--|\+=|-=|\*=|\/=|&&|\|\||<<|>>|[+\-*/%&|^!~=<>?:])/,
};

const PUNCTUATION_RULE: Rule = { type: "punctuation", regex: /^[{}()[\].,;]/ };
const TEXT_IDENT_RULE: Rule = { type: "text", regex: /^[a-zA-Z0-9_]+/ };
const TEXT_FALLBACK_RULE: Rule = {
  type: "text",
  regex: /^[^\s"'`\w+\-*/%&|^!~=<>?:{}()[\].,;]+/,
};
const WHITESPACE_RULE: Rule = { type: "whitespace", regex: /^\s+/ };

/** Punctuation, optional mid-tail rules, identifiers, fallback chars, whitespace. */
export function tokenTailRules(afterPunctuation: Rule[] = []): Rule[] {
  return [
    PUNCTUATION_RULE,
    ...afterPunctuation,
    TEXT_IDENT_RULE,
    TEXT_FALLBACK_RULE,
    WHITESPACE_RULE,
  ];
}
