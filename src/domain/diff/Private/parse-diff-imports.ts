// @Architecture(descriptionShort="Extracts added and removed import edges from unified diff text")
import type { Edge, ModuleNode, ProjectGraph } from "../../graph";

export interface ParsedImportEdges {
  addedEdges: Edge[];
  removedEdges: Edge[];
  addedEdgeIds: Set<string>;
}

/**
 * Path/id → module lookup built ONCE per diff. Resolution used to scan the module array per
 * candidate extension for every +/- line — O(lines × modules × 14) on a large diff, which is
 * what made "visualize diff" take a while before anything rendered.
 */
interface ModuleIndex {
  byPath: Map<string, ModuleNode>;
  /** Suffix resolution matches on `endsWith`/label so it stays linear, but it is memoized per
   *  specifier so a repeated import across one diff resolves once. */
  suffixCache: Map<string, ModuleNode | undefined>;
}

interface ParseContext {
  index: ModuleIndex;
  addedEdges: Edge[];
  removedEdges: Edge[];
  addedEdgeIds: Set<string>;
}

function buildModuleIndex(modules: readonly ModuleNode[]): ModuleIndex {
  const byPath = new Map<string, ModuleNode>();
  for (const module of modules) {
    if (!byPath.has(module.path)) byPath.set(module.path, module);
    if (!byPath.has(module.id)) byPath.set(module.id, module);
  }
  return { byPath, suffixCache: new Map() };
}

/** Parse unified diff text to infer added and removed import edges. */
export function parseDiffImportEdges(
  text: string,
  graph: ProjectGraph,
  ghostModules: readonly ModuleNode[] = [],
): ParsedImportEdges {
  const ctx: ParseContext = {
    index: buildModuleIndex([...graph.modules, ...ghostModules]),
    addedEdges: [],
    removedEdges: [],
    addedEdgeIds: new Set(),
  };
  let currentSource: string | null = null;

  for (const raw of text.split(/\r?\n/)) {
    if (raw.startsWith("diff --git ")) {
      currentSource = sourceFromDiffGit(raw);
    } else if (currentSource && !raw.startsWith("--- ") && !raw.startsWith("+++ ")) {
      processDiffLine(raw, currentSource, ctx);
    }
  }
  return {
    addedEdges: ctx.addedEdges,
    removedEdges: ctx.removedEdges,
    addedEdgeIds: ctx.addedEdgeIds,
  };
}

function processDiffLine(raw: string, currentSource: string, ctx: ParseContext) {
  if (raw.startsWith("+") && !raw.startsWith("+++")) {
    const edge = edgeFromLine(raw.slice(1), currentSource, ctx.index);
    if (edge && !ctx.addedEdgeIds.has(edge.id)) {
      ctx.addedEdges.push(edge);
      ctx.addedEdgeIds.add(edge.id);
    }
  } else if (raw.startsWith("-") && !raw.startsWith("---")) {
    const edge = edgeFromLine(raw.slice(1), currentSource, ctx.index);
    if (edge && !ctx.removedEdges.some((e) => e.id === edge.id)) {
      ctx.removedEdges.push(edge);
    }
  }
}

function edgeFromLine(
  line: string,
  sourcePath: string,
  index: ModuleIndex,
): Edge | null {
  const specifier = extractImportSpecifier(line);
  if (!specifier) return null;
  const target = resolveImportSpecifier(sourcePath, specifier, index);
  if (!target || target.id === sourcePath) return null;

  return {
    id: `${sourcePath}->${target.id}:import:diff`,
    source: sourcePath,
    target: target.id,
    kind: "import",
    trigger: "import",
    isViolation: false,
  };
}

function extractImportSpecifier(line: string): string | null {
  const trimmed = line.trim();
  const js = trimmed.match(/^(?:import|export)\b[^"']*\bfrom\s*["']([^"']+)["']/)
    ?? trimmed.match(/^import\s*["']([^"']+)["']/)
    ?? trimmed.match(/^(?:const|let|var)\s+.*?=\s*require\(["']([^"']+)["']\)/);
  if (js) return js[1] ?? null;

  const rust = trimmed.match(/^use\s+(?:crate::|super::)?([a-zA-Z0-9_:]+);/);
  if (rust) return rust[1] ?? null;

  const cpp = trimmed.match(/^#include\s*["<]([^">]+)[">]/);
  if (cpp) return cpp[1] ?? null;

  const cs = trimmed.match(/^using\s+([a-zA-Z0-9_.]+);/);
  return cs ? cs[1] ?? null : null;
}

function resolveImportSpecifier(
  sourcePath: string,
  rawSpecifier: string,
  index: ModuleIndex,
): ModuleNode | undefined {
  const spec = rawSpecifier.replace(/['";]/g, "").trim();
  const sourceDir = sourcePath.includes("/")
    ? sourcePath.slice(0, sourcePath.lastIndexOf("/"))
    : "";

  if (spec.startsWith("./") || spec.startsWith("../")) {
    return findModuleByPath(normalizePath(`${sourceDir}/${spec}`), index);
  }
  if (spec.startsWith("@/")) {
    const target = spec.slice(2);
    return findModuleByPath(`src/${target}`, index) || findModuleByPath(target, index);
  }
  if (spec.startsWith("crate::")) {
    const target = spec.slice(7).replace(/::/g, "/");
    return findModuleByPath(`src/${target}`, index) || findModuleByPath(target, index);
  }
  return findModuleBySuffix(spec.replace(/::/g, "/"), index);
}

function findModuleBySuffix(clean: string, index: ModuleIndex): ModuleNode | undefined {
  if (index.suffixCache.has(clean)) return index.suffixCache.get(clean);
  const modules = [...index.byPath.values()];
  const match = modules.find(
    (m) =>
      m.path.endsWith(clean) ||
      m.path.endsWith(`/${clean}`) ||
      m.label === clean ||
      m.label.startsWith(`${clean}.`),
  );
  index.suffixCache.set(clean, match);
  return match;
}

const MODULE_EXTENSIONS = [
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
] as const;

function findModuleByPath(
  targetPath: string,
  index: ModuleIndex,
): ModuleNode | undefined {
  for (const ext of MODULE_EXTENSIONS) {
    const match = index.byPath.get(targetPath + ext);
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

function sourceFromDiffGit(line: string): string | null {
  const match = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
  if (!match) return null;
  const path = match[2] ?? match[1];
  return path ? path.replace(/\\/g, "/") : null;
}