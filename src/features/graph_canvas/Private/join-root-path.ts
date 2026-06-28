/** Join project root and a graph-relative module path for the native shell. */
export function joinRootPath(root: string, relativePath: string): string {
  const base = root.replace(/[/\\]+$/, "");
  const rel = relativePath.replace(/^[/\\]+/, "");
  const sep = base.includes("\\") ? "\\" : "/";
  return `${base}${sep}${rel.replace(/\//g, sep)}`;
}
