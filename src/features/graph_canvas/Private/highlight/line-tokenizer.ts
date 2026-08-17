// @Architecture(descriptionShort="Stateful line-by-line tokenizer that carries block comments across lines")
import { getLanguageForFile, type BlockComment } from "./highlighter-language-rules";
import type { Rule, Token } from "./highlighter";

/**
 * Tokenizes one line at a time, remembering whether an unterminated block
 * comment is still open. Callers that render rows independently ([[./DiffCodeLines.tsx]],
 * which feeds both L2 documents and preview frames) must reuse one instance
 * per document, in line order.
 */
export class LineTokenizer {
  private readonly rules: Rule[];
  private readonly blockComment?: BlockComment;
  private insideBlockComment = false;

  constructor(filepath: string) {
    const language = getLanguageForFile(filepath);
    this.rules = language.rules;
    this.blockComment = language.blockComment;
  }

  tokenizeLine(text: string): Token[] {
    const tokens: Token[] = [];
    let remaining = text;
    while (remaining.length > 0) {
      const token = this.nextToken(remaining);
      tokens.push(token);
      remaining = remaining.slice(token.text.length);
    }
    return tokens;
  }

  private nextToken(remaining: string): Token {
    const carried = this.continueBlockComment(remaining);
    if (carried) return carried;
    const opened = this.openBlockComment(remaining);
    if (opened) return opened;
    for (const rule of this.rules) {
      const match = remaining.match(rule.regex);
      if (match) return { type: rule.type, text: match[0] };
    }
    return { type: "text", text: remaining[0]! };
  }

  /** Inside a carried-over comment: consume up to and including the closer. */
  private continueBlockComment(remaining: string): Token | undefined {
    const comment = this.blockComment;
    if (!this.insideBlockComment || !comment) return undefined;
    const end = remaining.indexOf(comment.close);
    if (end < 0) return { type: "comment", text: remaining };
    this.insideBlockComment = false;
    return { type: "comment", text: remaining.slice(0, end + comment.close.length) };
  }

  /** An opener with no closer left on this line comments the rest of it. */
  private openBlockComment(remaining: string): Token | undefined {
    const comment = this.blockComment;
    if (!comment || !remaining.startsWith(comment.open)) return undefined;
    if (remaining.includes(comment.close, comment.open.length)) return undefined;
    this.insideBlockComment = true;
    return { type: "comment", text: remaining };
  }
}
