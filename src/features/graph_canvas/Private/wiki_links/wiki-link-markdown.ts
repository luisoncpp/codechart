// @Architecture(descriptionShort="marked inline extension turning `[[target]]` into a clickable anchor")
import type { RendererObject, TokenizerAndRendererExtension, Tokens } from "marked";
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

/** `https:`, `mailto:`, `file:`… — anything the webview would navigate to. */
const URL_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

function decodeHref(href: string): string {
  try {
    return decodeURI(href);
  } catch {
    return href;
  }
}

/**
 * Plain markdown links to project files (`[flow](docs/x.md#Section)`) render as
 * wiki-link anchors with **no `href`**: a real relative `href` navigates the
 * whole webview, which reloads the app. External URLs keep the default anchor.
 */
export const markdownLinkRenderer: RendererObject = {
  link({ href, tokens }: Tokens.Link) {
    if (URL_SCHEME.test(href)) return false;
    const label = this.parser.parseInline(tokens);
    return `<a class="hl-wiki-link" data-wiki-target="${escapeHtml(decodeHref(href))}">${label}</a>`;
  },
};
