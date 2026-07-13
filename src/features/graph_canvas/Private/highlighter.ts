// @Architecture(descriptionShort="Lightweight token-based syntax highlighter for multiple languages")

import { getRulesForFile } from "./highlighter-language-rules";

export interface Token {
  type: string;
  text: string;
}

export interface Rule {
  type: string;
  regex: RegExp;
}

/**
 * Tokenizes code based on language derived from file path extension.
 * Returns an array of lines, where each line is an array of Token objects.
 */
export function tokenizeCode(code: string, filepath: string): Token[][] {
  const rules = getRulesForFile(filepath);
  const tokens: Token[] = [];
  let remaining = code;

  const maxIterations = code.length * 2 + 100;
  let iterations = 0;

  while (remaining.length > 0 && iterations < maxIterations) {
    iterations++;
    let matched = false;
    for (const rule of rules) {
      const match = remaining.match(rule.regex);
      if (match) {
        tokens.push({ type: rule.type, text: match[0] });
        remaining = remaining.slice(match[0].length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      tokens.push({ type: "text", text: remaining[0] });
      remaining = remaining.slice(1);
    }
  }

  const lines: Token[][] = [[]];
  for (const token of tokens) {
    const parts = token.text.split("\n");
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) {
        lines.push([]);
      }
      if (parts[i].length > 0) {
        lines[lines.length - 1].push({ type: token.type, text: parts[i] });
      }
    }
  }

  return lines;
}
