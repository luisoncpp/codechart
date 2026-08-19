// @Architecture(descriptionShort="Merges edge path d strings for batched SVG draw")
export function mergePathD(segments: { path: string }[]): string {
  if (segments.length === 0) return "";
  return segments.map((segment) => segment.path).join(" ");
}
