// @Architecture(descriptionShort="Extracts added and removed import edges from unified diff text")
import type { Edge, ModuleNode, ProjectGraph } from "../../graph";

export interface ParsedImportEdges {
  addedEdges: Edge[];
  removedEdges: Edge[];
  addedEdgeIds: Set<string>;
}

interface ParseContext {
  allModules: ModuleNode[];
  addedEdges: Edge[];
  removedEdges: Edge[];
  addedEdgeIds: Set<string>;
}

/** Parse unified diff text to infer added and removed import edges. */
export function parseDiffImportEdges(
  text: string,
  graph: ProjectGraph,
  ghostModules: readonly ModuleNode[] = [],
): ParsedImportEdges {
  const ctx: ParseContext = {
    allModules: [...graph.modules, ...ghostModules],
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
    const edge = edgeFromLine(raw.slice(1), currentSource, ctx.allModules);
    if (edge && !ctx.addedEdgeIds.has(edge.id)) {
      ctx.addedEdges.push(edge);
      ctx.addedEdgeIds.add(edge.id);
    }
  } else if (raw.startsWith("-") && !raw.startsWith("---")) {
    const edge = edgeFromLine(raw.slice(1), currentSource, ctx.allModules);
    if (edge && !ctx.removedEdges.some((e) => e.id === edge.id)) {
      ctx.removedEdges.push(edge);
    }
  }
}

function edgeFromLine(
  line: string,
  sourcePath: string,
  modules: readonly ModuleNode[],
): Edge | null {
  const specifier = extractImportSpecifier(line);
  if (!specifier) return null;
  const target = resolveImportSpecifier(sourcePath, specifier, modules);
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

function sourceFromDiffGit(line: string): string | null {
  const match = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
  if (!match) return null;
  const path = match[2] ?? match[1];
  return path ? path.replace(/\\/g, "/") : null;
}
