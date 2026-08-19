/** Split a wiki-link target on the first `#` before path resolution. */
export function splitWikiTarget(raw: string): { pathPart: string; section: string | null } {
  const hash = raw.indexOf("#");
  if (hash === -1) return { pathPart: raw.trim(), section: null };
  const pathPart = raw.slice(0, hash).trim();
  const sectionRaw = raw.slice(hash + 1).trim();
  return { pathPart, section: sectionRaw.length > 0 ? sectionRaw : null };
}
