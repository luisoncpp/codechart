// @Architecture(descriptionShort="Tauri and in-memory implementations of ReviewStackClient")
import { invoke } from "@tauri-apps/api/core";
import type { Diagnostic, ProjectGraph } from "../../../domain/graph";
import type { ReviewStackClient, ReviewStackRecord } from "./types";

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function createTauriReviewStackClient(): ReviewStackClient {
  if (!isTauriRuntime()) return createMemoryReviewStackClient();
  return {
    loadStack: (root, diffId) => invoke("load_review_stack", { root, diffId }),
    saveStack: (root, stack) => invoke("save_review_stack", { root, stack }),
    deleteStack: (root, diffId) => invoke("delete_review_stack", { root, diffId }),
    clearStacks: (root) => invoke("clear_review_stacks", { root }),
    analyzeDiffImpact: (args) =>
      invoke("analyze_diff_impact", {
        before: args.before ?? null,
        after: args.after,
        changedModuleIds: args.changedModuleIds,
        maxDepth: args.maxDepth ?? 3,
      }),
    computeBlastRadius: (args) =>
      invoke("compute_module_blast_radius", {
        graph: args.graph,
        seedIds: args.seedIds,
        maxDepth: args.maxDepth ?? 3,
      }),
    respondToBridge: (id, result, error = null) =>
      invoke("mcp_bridge_respond", { id, result: error ? null : result, error }),
  };
}

export function createMemoryReviewStackClient(): ReviewStackClient {
  const map = new Map<string, ReviewStackRecord>();
  const key = (root: string, diffId: string) => `${root}::${diffId}`;
  return {
    loadStack: async (root, diffId) => map.get(key(root, diffId)) ?? null,
    saveStack: async (root, stack) => {
      map.set(key(root, stack.diffId), structuredClone(stack));
    },
    deleteStack: async (root, diffId) => {
      map.delete(key(root, diffId));
    },
    clearStacks: async (root) => {
      for (const k of map.keys()) {
        if (k.startsWith(`${root}::`)) map.delete(k);
      }
    },
    analyzeDiffImpact: async (args) => ({
      changedModuleIds: [...args.changedModuleIds].sort(),
      layers: args.changedModuleIds.length
        ? [{ index: 0, moduleIds: [...args.changedModuleIds].sort(), dependsOnLayers: [], groupIds: [], cyclic: false }]
        : [],
      blastRadius: [],
      affectedGroupIds: [],
      newDiagnostics: newDiagnostics(args.before ?? null, args.after),
    }),
    computeBlastRadius: async () => [[], []],
    respondToBridge: async () => true,
  };
}

/** Mirrors Rust `compute_delta_diagnostics`: after-diagnostics absent from before (kind|module|message). */
function newDiagnostics(before: ProjectGraph | null, after: ProjectGraph): Diagnostic[] {
  if (!before) return [];
  const key = (d: Diagnostic) => `${d.kind}|${d.moduleId ?? "-"}|${d.message}`;
  const existing = new Set(before.diagnostics.map(key));
  return after.diagnostics.filter((d) => !existing.has(key(d)));
}
