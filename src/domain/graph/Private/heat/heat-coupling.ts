// @Architecture(descriptionShort="Martin instability from unique solid-import neighbors")
import type { Edge } from "../../model/Edge";
import type { ProjectGraph } from "../../model/ProjectGraph";
import { importedBy, importsOf } from "../selectors";

/** Ce / (Ce + Ca). Isolated modules (no solid imports either way) are 0. */
export function instabilityRatio(graph: ProjectGraph, moduleId: string): number {
  const ce = uniqueEndpoints(importsOf(graph, moduleId), "target");
  const ca = uniqueEndpoints(importedBy(graph, moduleId), "source");
  const total = ce + ca;
  if (total === 0) return 0;
  return ce / total;
}

function uniqueEndpoints(edges: Edge[], field: "source" | "target"): number {
  return new Set(edges.map((e) => e[field])).size;
}
