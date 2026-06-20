import ELK from "elkjs/lib/elk.bundled.js";
import type { ProjectGraph } from "../../graph";
import type { LayoutEngine, LayoutedGraph } from "./layout-types";
import { buildElkGraph } from "./elk-input";
import { toLayoutedGraph } from "./absolute-coords";

/** ELK-backed nested layout. ELK details stay private behind this class. */
export class ElkLayoutEngine implements LayoutEngine {
  private readonly elk = new ELK();

  async layout(graph: ProjectGraph): Promise<LayoutedGraph> {
    const groupIds = new Set(graph.groups.map((g) => g.id));
    const result = await this.elk.layout(buildElkGraph(graph));
    return toLayoutedGraph(result, groupIds);
  }
}
