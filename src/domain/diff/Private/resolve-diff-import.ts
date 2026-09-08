// @Architecture(descriptionShort="Extracts an import specifier from one diff line and resolves it to a module")
import type { ModuleNode } from "../../graph";

/**
 * First pattern to match wins; capture group 1 is the specifier. Order matters only
 * between the two JS import forms, which cannot overlap anyway.
 *
 * **Every pattern here must be linear.** This runs once per `+`/`-` line of the diff, and
 * most of those lines match nothing — so the cost that matters is the cost of *failing*.
 * The JS clause form and the bare `import "x"` form are two entries rather than one for
 * exactly that reason: covering both at once needs a repeated clause group, and a repeated
 * group whose body can match a run of identifier characters backtracks exponentially on
 * every `export`/`import` line that is not an import. See tests/diff.test.ts and
 * `lessons-learned/one-regex-for-two-import-forms-is-a-redos.md`.
 */
const SpecifierPatterns = [
  /^(?:import|export)\b[^"']*\bfrom\s*["']([^"']+)["']/,        // import/export … from "x"
  /^import\s*["']([^"']+)["']/,                                  // side-effect import "x"
  /^(?:const|let|var)\s+.*?=\s*require\(["']([^"']+)["']\)/,     // CommonJS
  /^use\s+(?:crate::|super::)?([a-zA-Z0-9_:]+);/,                // Rust
  /^#include\s*["<]([^">]+)[">]/,                                // C / C++
  /^using\s+([a-zA-Z0-9_.]+);/,                                  // C#
] as const;

export function extractImportSpecifier(line: string): string | null {
  const trimmed = line.trim();
  for (const pattern of SpecifierPatterns) {
    const match = trimmed.match(pattern);
    if (match) return match[1] ?? null;
  }
  return null;
}

export function resolveImportSpecifier(
  sourcePath: string,
  rawSpecifier: string,
  modules: readonly ModuleNode[],
): ModuleNode | undefined {
  const spec = rawSpecifier.replace(/['";]/g, "").trim();
  const sourceDir = sourcePath.includes("/")
    ? sourcePath.slice(0, sourcePath.lastIndexOf("/"))
    : "";

  if (spec.startsWith("./") || spec.startsWith("../")) {
    return findModuleByPath(normalizePath(`${sourceDir}/${spec}`), modules);
  }
  if (spec.startsWith("@/")) {
    const target = spec.slice(2);
    return findModuleByPath(`src/${target}`, modules) || findModuleByPath(target, modules);
  }
  if (spec.startsWith("crate::")) {
    const target = spec.slice(7).replace(/::/g, "/");
    return findModuleByPath(`src/${target}`, modules) || findModuleByPath(target, modules);
  }
  return findModuleBySuffix(spec.replace(/::/g, "/"), modules);
}

function findModuleBySuffix(clean: string, modules: readonly ModuleNode[]): ModuleNode | undefined {
  return modules.find(
    (m) =>
      m.path.endsWith(clean) ||
      m.path.endsWith(`/${clean}`) ||
      m.label === clean ||
      m.label.startsWith(`${clean}.`),
  );
}

function findModuleByPath(
  targetPath: string,
  modules: readonly ModuleNode[],
): ModuleNode | undefined {
  const exts = [
    "",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".rs",
    ".cpp",
    ".cs",
    ".h",
    ".hpp",
    "/index.ts",
    "/index.tsx",
    "/index.js",
    "/mod.rs",
  ];
  for (const ext of exts) {
    const candidate = targetPath + ext;
    const match = modules.find((m) => m.path === candidate || m.id === candidate);
    if (match) return match;
  }
  return undefined;
}

function normalizePath(path: string): string {
  const stack: string[] = [];
  for (const part of path.split("/").filter((p) => p && p !== ".")) {
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  return stack.join("/");
}
