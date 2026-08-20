// @Architecture(descriptionShort="Stable identity for a diff overlay (persistence key)")

/** Persistence key for a commit-to-commit diff. */
export function commitDiffId(baseRef: string, headRef: string): string {
  return `commits:${baseRef}..${headRef}`;
}

/** Persistence key for a working-tree diff against a base ref. */
export function workingTreeDiffId(baseRef: string): string {
  return `working-tree:${baseRef}`;
}

/** Persistence key for pasted diff text (content-addressed, marker-stripped). */
export function pasteDiffId(text: string): string {
  const stripped = stripMarkerLines(text);
  return `paste:${fnv1aHex(stripped)}`;
}

function stripMarkerLines(text: string): string {
  return text
    .split(/\r?\n/)
    .filter((line) => !line.startsWith("#"))
    .join("\n");
}

/** FNV-1a 32-bit hash — enough to tell pasted diffs apart, stable per content. */
function fnv1aHex(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
