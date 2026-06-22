// @Architecture(descriptionShort="ELK layout engine implementation running inside the web worker")
import ELK from "elkjs/lib/elk.bundled.js";
import type { ProjectGraph } from "../../graph";
import type { LayoutEngine, LayoutedGraph, LayoutOptions } from "./layout-types";
import { buildElkGraph, descriptionBoxId } from "./elk-input";
import { toLayoutedGraph } from "./absolute-coords";

/** ELK-backed nested layout. ELK details stay private behind this class. */
export class ElkLayoutEngine implements LayoutEngine {
  private readonly elk = new ELK();

  async layout(graph: ProjectGraph, options?: LayoutOptions): Promise<LayoutedGraph> {
    const groupIds = new Set(graph.groups.map((g) => g.id));
    const moduleIds = new Set(graph.modules.map((m) => m.id));
    const descriptionIds = new Set(graph.groups.map((g) => descriptionBoxId(g.id)));
    const result = await this.elk.layout(buildElkGraph(graph, options));
    return toLayoutedGraph(result, groupIds, moduleIds, descriptionIds);
  }
}
