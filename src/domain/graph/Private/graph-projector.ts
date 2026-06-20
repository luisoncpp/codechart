import { ProjectGraph } from "../index";

export function projectGraphSummary(graph: ProjectGraph) {
  return {
    moduleCount: graph.modules.length,
    edgeCount: graph.edges.length,
    diagnosticCount: graph.diagnostics.length,
  };
}
