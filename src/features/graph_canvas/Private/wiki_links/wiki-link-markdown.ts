// @Architecture(descriptionShort="marked inline extension turning `[[target]]` into a clickable anchor")
import type { TokenizerAndRendererExtension, Tokens } from "marked";
import { matchWikiLinkPrefix } from "./wiki-link-parser";

interface WikiLinkToken extends Tokens.Generic {
  type: "wikiLink";
  raw: string;
  target: string;
  label: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Register on a private `Marked` instance, never on the shared `marked`
 * default export — that would mutate markdown rendering process-wide.
 * The anchor carries only the target; the linking file comes from the
 * `data-wiki-from` wrapper (see `wikiLinkFromEvent`).
 */
export const wikiLinkExtension: TokenizerAndRendererExtension = {
  name: "wikiLink",
  level: "inline",
  start(src: string) {
    const at = src.indexOf("[[");
    return at === -1 ? undefined : at;
  },
  tokenizer(src: string) {
    const link = matchWikiLinkPrefix(src);
    if (!link) return undefined;
    return { type: "wikiLink", ...link } satisfies WikiLinkToken;
  },
  renderer(token: Tokens.Generic) {
    const { target, label } = token as WikiLinkToken;
    return `<a class="hl-wiki-link" data-wiki-target="${escapeHtml(target)}">${escapeHtml(label)}</a>`;
  },
};
