// @Architecture(descriptionShort="Pure ordering of the paths a wiki link could mean")
import type { WikiLinkClick } from "./wiki-link-dom";
import { modulePathSuffixMatch, resolveWikiPath } from "./wiki-link-target";
import { splitWikiTarget } from "./wiki-link-target-split";

/**
 * Paths to try, best guess first. A bare name (`[[store.ts]]`) is far more
 * likely a module reference than a file at the project root, so the module
 * match leads; a target with a directory in it is read as a path first.
 */
export function wikiLinkCandidates(
  link: WikiLinkClick,
  modulePaths: readonly string[],
): string[] {
  const { pathPart } = splitWikiTarget(link.target);
  if (pathPart === "") return link.fromPath ? [link.fromPath] : [];
  const direct = resolveWikiPath(pathPart, link.fromPath);
  const module = modulePathSuffixMatch(modulePaths, pathPart);
  const bareName = !pathPart.includes("/") && !pathPart.includes("\\");
  const ordered = bareName ? [module, direct] : [direct, module];
  return [...new Set(ordered.filter((path): path is string => path !== null))];
}
