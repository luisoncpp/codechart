// @Architecture(descriptionShort="Classifies exported symbols changed across source snapshots")
import { symbolBoxId, type ModuleNode, type ProjectGraph } from "../../graph";
import type { FileLineDiff } from "./line-diff-types";

export interface SymbolChangeSets {
  addedSymbolIds: ReadonlySet<string>;
  removedSymbolIds: ReadonlySet<string>;
  modifiedSymbolIds: ReadonlySet<string>;
}

export interface SymbolDiffInput {
  before: ProjectGraph;
  after: ProjectGraph;
  beforeSources: ReadonlyMap<string, string>;
  afterSources: ReadonlyMap<string, string>;
  lineDiffByPath: ReadonlyMap<string, FileLineDiff>;
}

interface LineRange {
  start: number;
  end: number;
}

/** Compare symbol membership and changed source ranges for an exact L1.5 state. */
export function classifySymbolChanges(input: SymbolDiffInput): SymbolChangeSets {
  const beforeById = indexModules(input.before.modules);
  const afterById = indexModules(input.after.modules);
  const added = new Set<string>();
  const removed = new Set<string>();
  const modified = new Set<string>();
  const moduleIds = new Set([...beforeById.keys(), ...afterById.keys()]);

  for (const moduleId of moduleIds) {
    const before = beforeById.get(moduleId);
    const after = afterById.get(moduleId);
    const names = classifyModuleNames(moduleId, before, after);
    names.added.forEach((id) => added.add(id));
    names.removed.forEach((id) => removed.add(id));
    if (before && after) {
      classifyModuleEdits(input, before, after).forEach((id) => modified.add(id));
    }
  }
  return {
    addedSymbolIds: added,
    removedSymbolIds: removed,
    modifiedSymbolIds: modified,
  };
}

function classifyModuleNames(
  moduleId: string,
  before: ModuleNode | undefined,
  after: ModuleNode | undefined,
) {
  const oldNames = new Set(before?.exportedSymbols ?? []);
  const newNames = new Set(after?.exportedSymbols ?? []);
  const added = [...newNames]
    .filter((name) => !oldNames.has(name))
    .map((name) => symbolBoxId(moduleId, name));
  const removed = [...oldNames]
    .filter((name) => !newNames.has(name))
    .map((name) => symbolBoxId(moduleId, name));
  return { added, removed };
}

function classifyModuleEdits(
  input: SymbolDiffInput,
  before: ModuleNode,
  after: ModuleNode,
): string[] {
  const diff = input.lineDiffByPath.get(after.path);
  const oldSource = input.beforeSources.get(before.path);
  const newSource = input.afterSources.get(after.path);
  if (!diff || oldSource === undefined || newSource === undefined) return [];
  const shared = before.exportedSymbols.filter((name) => after.exportedSymbols.includes(name));
  const oldRanges = exportedSymbolRanges(oldSource, shared);
  const newRanges = exportedSymbolRanges(newSource, shared);

  return shared.flatMap((name) => {
    const oldChanged = touches(diff.removedLineNumbers, oldRanges.get(name));
    const newChanged = touches(diff.addedLineNumbers, newRanges.get(name));
    return oldChanged || newChanged ? [symbolBoxId(after.id, name)] : [];
  });
}

function exportedSymbolRanges(source: string, symbols: readonly string[]) {
  const lines = source.split(/\r?\n/);
  const starts = symbols
    .flatMap((name) => {
      const start = declarationLine(lines, name);
      return start === null ? [] : [{ name, start }];
    })
    .sort((a, b) => a.start - b.start);
  const ranges = new Map<string, LineRange>();
  for (let index = 0; index < starts.length; index++) {
    const current = starts[index]!;
    const nextStart = starts[index + 1]?.start ?? lines.length + 1;
    const end = bodyEnd(lines, current.start) ?? nextStart - 1;
    ranges.set(current.name, {
      start: current.start + 1,
      end: Math.max(current.start + 1, end + 1),
    });
  }
  return ranges;
}

function declarationLine(lines: readonly string[], name: string): number | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const namedDeclaration = new RegExp(
    `\\b(?:function|fn|def|class|struct|interface|type|enum|trait|const|let|var|static|mod)\\s+${escaped}\\b`,
  );
  const callable = new RegExp(`\\b${escaped}\\s*\\(`);
  const identifier = new RegExp(`\\b${escaped}\\b`);
  let fallback: number | null = null;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!;
    if (namedDeclaration.test(line)) return index;
    if (fallback === null && (callable.test(line) || identifier.test(line))) fallback = index;
  }
  return fallback;
}

function bodyEnd(lines: readonly string[], start: number): number | null {
  let depth = 0;
  let opened = false;
  for (let index = start; index < lines.length; index++) {
    for (const character of lines[index]!) {
      if (character === "{") {
        opened = true;
        depth++;
      } else if (character === "}" && opened) {
        depth--;
      }
    }
    if (opened && depth <= 0) return index;
    if (!opened && lines[index]!.includes(";")) return index;
  }
  return null;
}

function touches(lines: ReadonlySet<number> | undefined, range: LineRange | undefined) {
  if (!lines || !range) return false;
  for (const line of lines) {
    if (line >= range.start && line <= range.end) return true;
  }
  return false;
}

function indexModules(modules: readonly ModuleNode[]) {
  return new Map(modules.map((module) => [module.id, module]));
}
