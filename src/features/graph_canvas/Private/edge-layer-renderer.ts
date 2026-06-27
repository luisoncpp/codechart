// @Architecture(descriptionShort="Builds the edge layer model from flow nodes")
import type { InternalNode, Node } from "@xyflow/react";
import type { RFEdgeT, RFNode } from "../../../domain/graph";
import { buildEdgeLayerModel, type EdgeLayerModel } from "./edge-layer-cache";
import { boxesFromFlowNodes } from "./node-boxes";

export class EdgeLayerRenderer {
  private edges: RFEdgeT[] = [];
  private model: EdgeLayerModel | null = null;

  setEdges(edges: RFEdgeT[]) {
    this.edges = edges;
    this.model = null;
  }

  rebuild(
    flowNodes: RFNode[],
    nodeLookup: Map<string, InternalNode<Node>>,
  ): EdgeLayerModel | null {
    const boxes = boxesFromFlowNodes(flowNodes, nodeLookup);
    this.model = buildEdgeLayerModel(this.edges, boxes);
    return this.model;
  }

  getModel(): EdgeLayerModel | null {
    return this.model;
  }
}
