// @Architecture(descriptionShort="Merges fetched preview sources into the local cache")

/** Merge fetched sources; returns the previous map untouched when nothing is new. */
export function withNewSources(
  prev: ReadonlyMap<string, string>,
  entries: readonly (readonly [string, string])[],
): ReadonlyMap<string, string> {
  const fresh = entries.filter(([id, text]) => text && prev.get(id) !== text);
  if (fresh.length === 0) return prev;
  const next = new Map(prev);
  for (const [id, text] of fresh) next.set(id, text);
  return next;
}
