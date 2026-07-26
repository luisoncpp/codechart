// @Architecture(descriptionShort="Lightweight token-based syntax highlighter for multiple languages")

import { LineTokenizer } from "./line-tokenizer";

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
  const tokenizer = new LineTokenizer(filepath);
  return code.split("\n").map((line) => tokenizer.tokenizeLine(line));
}
