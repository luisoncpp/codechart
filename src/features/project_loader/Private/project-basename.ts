// @Architecture(descriptionShort="Folder basename extraction for the toolbar project chip")

/** Last path segment, tolerating `/` or `\` separators and trailing separators. */
export function projectBasename(root: string): string {
  const trimmed = root.replace(/[\\/]+$/, "");
  const lastSeparator = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  const name = trimmed.slice(lastSeparator + 1);
  return name || trimmed;
}
