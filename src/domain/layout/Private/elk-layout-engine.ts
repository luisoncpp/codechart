import { ProjectGraph } from "../../graph";

export interface LayoutEngine {
  layout(graph: ProjectGraph): Promise<ProjectGraph>;
}

export class ElkLayoutEngine implements LayoutEngine {
  async layout(graph: ProjectGraph) {
    return graph;
  }
}
