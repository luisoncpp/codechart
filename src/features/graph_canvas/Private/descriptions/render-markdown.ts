// @Architecture(descriptionShort="Cached Markdown parsing for descriptions with wiki-link support")
import { Marked } from "marked";
import { wikiLinkExtension } from "../wiki_links";

const inlineMarkdown = new Marked({ async: false })
  .use({ extensions: [wikiLinkExtension] });

const blockMarkdown = new Marked({ async: false })
  .use({ extensions: [wikiLinkExtension] });

const inlineCache = new Map<string, string>();
const blockCache = new Map<string, string>();
const MAX_CACHE_SIZE = 1000;

/** Parse single-line inline markdown with caching to avoid re-parsing during pan. */
export function renderInlineMarkdown(source: string): string {
  const cached = inlineCache.get(source);
  if (cached !== undefined) return cached;
  const rendered = inlineMarkdown.parseInline(source, { async: /*isAsync=*/false }) as string;
  if (inlineCache.size >= MAX_CACHE_SIZE) inlineCache.clear();
  inlineCache.set(source, rendered);
  return rendered;
}

/** Parse multi-line block markdown with caching to avoid re-parsing during pan. */
export function renderBlockMarkdown(source: string): string {
  const cached = blockCache.get(source);
  if (cached !== undefined) return cached;
  const rendered = blockMarkdown.parse(source, { async: /*isAsync=*/false }) as string;
  if (blockCache.size >= MAX_CACHE_SIZE) blockCache.clear();
  blockCache.set(source, rendered);
  return rendered;
}

