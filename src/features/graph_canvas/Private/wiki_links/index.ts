export { splitWikiTarget } from "./wiki-link-target-split";
export { normalizeSectionKey, findSectionInSource } from "./wiki-link-section";
export { wikiLinkCandidates } from "./wiki-link-candidates";
export {
  resolveWikiPath,
  modulePathSuffixMatch,
  isMarkdownPath,
  baseNameOf,
} from "./wiki-link-target";
export { wikiLinkFromEvent, type WikiLinkClick } from "./wiki-link-dom";
export { findWikiLinks, type WikiLinkSpan } from "./wiki-link-parser";
export { wikiLinkExtension } from "./wiki-link-markdown";
export { segmentByLinks } from "./wiki-link-segments";
