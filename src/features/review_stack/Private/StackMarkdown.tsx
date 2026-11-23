// @Architecture(descriptionShort="Renders agent-authored markdown (stack summary, cohort rationale) safely inside the Review Stack drawer")
import { useMemo } from "react";
import { Marked, type Tokens } from "marked";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Private instance: agent text is untrusted, so raw HTML is escaped. A
 * scheme-less link would become a relative `href` that navigates the whole
 * webview (see lesson relative-markdown-href-reloads-the-webview), so it is
 * rendered as its label only.
 */
const stackMarked = new Marked({ async: false }).use({
  renderer: {
    html({ raw }: { raw: string }) {
      return escapeHtml(raw);
    },
    link({ href, tokens }: Tokens.Link) {
      const label = this.parser.parseInline(tokens);
      if (!HAS_SCHEME.test(href)) return label;
      return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    },
    image({ text }: Tokens.Image) {
      return escapeHtml(text);
    },
  },
});

export function renderStackMarkdown(source: string): string {
  return stackMarked.parse(source) as string;
}

interface StackMarkdownProps {
  source: string;
  className: string;
}

export function StackMarkdown({ source, className }: StackMarkdownProps) {
  const html = useMemo(/*parseMarkdown*/ () => renderStackMarkdown(source), [source]);
  return <div className={`rs-markdown ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
