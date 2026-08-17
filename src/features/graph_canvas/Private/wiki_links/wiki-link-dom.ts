// @Architecture(descriptionShort="Reads a clicked wiki link out of a DOM event target")

/** A clicked link: what it points at, and the file it was written in. */
export interface WikiLinkClick {
  target: string;
  fromPath: string;
}

/**
 * Code rows carry both attributes on the link span itself; rendered markdown
 * carries `data-wiki-target` on the anchor and `data-wiki-from` on the
 * `MarkdownBody` wrapper — `closest` covers both shapes.
 */
export function wikiLinkFromEvent(node: EventTarget | null): WikiLinkClick | null {
  if (!(node instanceof Element)) return null;
  const link = node.closest("[data-wiki-target]");
  const target = link?.getAttribute("data-wiki-target");
  if (!target) return null;
  const fromPath = link!.closest("[data-wiki-from]")?.getAttribute("data-wiki-from");
  return { target, fromPath: fromPath ?? "" };
}
