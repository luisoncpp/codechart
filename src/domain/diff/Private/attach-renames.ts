// @Architecture(descriptionShort="Attaches 1:1 rename pairs from git headers plus fingerprint fallback")
import type { ModuleNode } from "../../graph";
import { bodiesFromUnifiedDiff, type DiffBodies } from "./rename-bodies";
import { fingerprintModule, matchRenamePairs } from "./rename-match";
import { pathsFromUnifiedDiff } from "./parse-unified-diff";
import type { GraphDiffOverlay, RenamePair } from "./types";

export interface RenameAttachInput {
  overlay: GraphDiffOverlay;
  beforeModules?: readonly ModuleNode[];
  afterModules?: readonly ModuleNode[];
  beforeSources?: ReadonlyMap<string, string>;
  afterSources?: ReadonlyMap<string, string>;
}

interface FingerprintCtx {
  bodies: DiffBodies;
  input: RenameAttachInput;
}

/** Keep git header pairs; match leftover deleted×added files 1:1. */
export function attachRenames(input: RenameAttachInput): GraphDiffOverlay {
  const header = headerPairs(input.overlay);
  const leftover = unpairedIds(input, header);
  if (leftover.deleted.length === 0 || leftover.added.length === 0) {
    return { ...input.overlay, renamePairs: header };
  }
  const bodies = bodiesFromUnifiedDiff(input.overlay.unifiedDiff ?? "");
  const ctx = { bodies, input };
  const extra = matchRenamePairs(
    fingerprintsFor(leftover.deleted, /*side=*/"old", ctx),
    fingerprintsFor(leftover.added, /*side=*/"new", ctx),
  );
  return { ...input.overlay, renamePairs: [...header, ...extra] };
}

function headerPairs(overlay: GraphDiffOverlay): RenamePair[] {
  const fromOverlay = overlay.renamePairs ?? [];
  const fromDiff = overlay.unifiedDiff
    ? pathsFromUnifiedDiff(overlay.unifiedDiff).renames
    : [];
  return uniquePairs([...fromOverlay, ...fromDiff]);
}

function uniquePairs(pairs: readonly RenamePair[]): RenamePair[] {
  const seen = new Set<string>();
  const out: RenamePair[] = [];
  for (const pair of pairs) {
    const key = `${pair.from}\0${pair.to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(pair);
  }
  return out;
}

function unpairedIds(
  input: RenameAttachInput,
  header: readonly RenamePair[],
): { deleted: string[]; added: string[] } {
  const takenFrom = new Set(header.map((pair) => pair.from));
  const takenTo = new Set(header.map((pair) => pair.to));
  const deleted = [...input.overlay.deletedModuleIds].filter((id) => !takenFrom.has(id));
  const added = [...addedModuleIds(input)].filter(
    (id) => !takenTo.has(id) && !input.overlay.deletedModuleIds.has(id),
  );
  return { deleted, added };
}

function addedModuleIds(input: RenameAttachInput): Set<string> {
  const added = new Set<string>();
  if (input.overlay.unifiedDiff) {
    for (const path of pathsFromUnifiedDiff(input.overlay.unifiedDiff).added) {
      added.add(path);
    }
  }
  if (!input.beforeModules) return added;
  const before = new Set(input.beforeModules.map((mod) => mod.id));
  for (const mod of input.afterModules ?? []) {
    if (!before.has(mod.id)) added.add(mod.id);
  }
  return added;
}

function fingerprintsFor(
  ids: readonly string[],
  side: "old" | "new",
  ctx: FingerprintCtx,
) {
  return ids.map((id) =>
    fingerprintModule({
      id,
      source: sourceFor(id, side, ctx),
      symbols: symbolsFor(id, side, ctx.input),
    }),
  );
}

function sourceFor(id: string, side: "old" | "new", ctx: FingerprintCtx): string {
  const { input, bodies } = ctx;
  if (side === "old") return input.beforeSources?.get(id) ?? bodies.old.get(id) ?? "";
  return input.afterSources?.get(id) ?? bodies.new.get(id) ?? "";
}

function symbolsFor(
  id: string,
  side: "old" | "new",
  input: RenameAttachInput,
): string[] {
  const modules = side === "old" ? input.beforeModules : input.afterModules;
  return modules?.find((mod) => mod.id === id)?.exportedSymbols ?? [];
}
