// @Architecture(descriptionShort="Pure resolution of a wiki-link target to a project-relative file path")

function normalizeSlashes(path: string): string {
  return path.replace(/\\/g, "/");
}

function isAbsolute(path: string): boolean {
  return path.startsWith("/") || /^[A-Za-z]:/.test(path);
}

function dirnameOf(path: string): string[] {
  const segments = normalizeSlashes(path).split("/");
  segments.pop();
  return segments.filter((segment) => segment.length > 0);
}

/** Collapse `.` and `..`; null when a `..` walks above the project root. */
function collapse(segments: readonly string[]): string | null {
  const out: string[] = [];
  for (const segment of segments) {
    if (segment === "" || segment === ".") continue;
    if (segment !== "..") {
      out.push(segment);
      continue;
    }
    if (out.length === 0) return null;
    out.pop();
  }
  return out.length > 0 ? out.join("/") : null;
}

/**
 * `[[./sibling.ts]]` and `[[../other/x.md]]` resolve against the linking file's
 * directory; anything else is read as project-relative. Absolute paths and
 * targets that escape the root return null — the `read_module_source` command
 * joins the path onto the root with no traversal guard of its own.
 */
export function resolveWikiPath(target: string, fromPath: string): string | null {
  const raw = normalizeSlashes(target.trim());
  if (!raw || isAbsolute(raw)) return null;
  const relative = raw.startsWith("./") || raw.startsWith("../");
  const base = relative ? dirnameOf(fromPath) : [];
  return collapse([...base, ...raw.split("/")]);
}

/**
 * Fallback for bare names: the shortest module path ending in the target, so
 * `[[store.ts]]` finds `src/core/store.ts` without writing the full path.
 */
export function modulePathSuffixMatch(
  paths: readonly string[],
  target: string,
): string | null {
  const needle = normalizeSlashes(target.trim());
  if (!needle) return null;
  let best: string | null = null;
  for (const path of paths) {
    const candidate = normalizeSlashes(path);
    if (candidate !== needle && !candidate.endsWith(`/${needle}`)) continue;
    if (best === null || candidate.length < best.length) best = candidate;
  }
  return best;
}

/** Markdown destinations render as rendered markdown, not tokenized rows. */
export function isMarkdownPath(path: string): boolean {
  return /\.(md|markdown)$/i.test(path);
}

/** File name of a project-relative path — a file frame's title. */
export function baseNameOf(path: string): string {
  const segments = normalizeSlashes(path).split("/");
  return segments[segments.length - 1] || path;
}
