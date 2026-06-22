// @Architecture(descriptionShort="Projects raw graph data into React Flow nodes and edges")
import type { ProjectGraph } from "../ProjectGraph";

export function projectGraphSummary(graph: ProjectGraph) {
  return {
    moduleCount: graph.modules.length,
    edgeCount: graph.edges.length,
    diagnosticCount: graph.diagnostics.length,
  };
}
