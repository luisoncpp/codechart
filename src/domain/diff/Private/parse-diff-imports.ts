// @Architecture(descriptionShort="Extracts added and removed import edges from unified diff text")
import type { Edge, ModuleNode, ProjectGraph } from "../../graph";
import { normalizeDiffPath } from "./parse-unified-diff";
import { extractImportSpecifier, resolveImportSpecifier } from "./resolve-diff-import";
import { scanDiffLines } from "./scan-diff-lines";

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

  let oldSource: string | null = null;

  for (const line of scanDiffLines(text)) {
    if (line.text.startsWith("diff --git ")) {
      currentSource = sourceFromDiffGit(line.text);
      oldSource = null;
      continue;
    }
    // A bare unified diff (`diff -u`, most LLM-generated patches) has no `diff --git`
    // line, so the `---`/`+++` pair is the only place the path appears. The after-path
    // owns the edge; a deleted file has none, so its removed imports fall back to the
    // before-path.
    if (line.header === "old") {
      oldSource = pathFromHeader(line.text.slice(4));
      continue;
    }
    if (line.header === "new") {
      currentSource = pathFromHeader(line.text.slice(4)) ?? oldSource;
      continue;
    }
    if (currentSource) processDiffLine(line.text, currentSource, ctx);
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

/** `a/foo` / `b/foo` / `foo` → `foo`; `/dev/null` and empty → null. */
function pathFromHeader(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "/dev/null") return null;
  return normalizeDiffPath(trimmed);
}

function sourceFromDiffGit(line: string): string | null {
  const match = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
  if (!match) return null;
  const path = match[2] ?? match[1];
  return path ? path.replace(/\\/g, "/") : null;
}
