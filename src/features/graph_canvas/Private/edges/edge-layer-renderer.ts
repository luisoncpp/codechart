// @Architecture(descriptionShort="Builds the edge layer model from flow nodes")
import type { InternalNode, Node } from "@xyflow/react";
import type { RFEdgeT, RFNode } from "../../../../domain/graph";
import { showArrowHeadsAtZoom } from "./edge-arrow-zoom";
import { buildEdgeLayerModel, type EdgeLayerModel } from "./edge-layer-cache";
import { boxesFromFlowNodes } from "./node-boxes";
import type { ViewportInput } from "./edge-viewport";
import {
  buildStaticEdgeModel,
  type ViewportEdgeModel,
} from "./viewport-edge-model";

export class EdgeLayerRenderer {
  private edges: RFEdgeT[] = [];
  private geometry: EdgeLayerModel | null = null;
  private viewportModel: ViewportEdgeModel | null = null;
  private lastViewport: ViewportInput | null = null;

  setEdges(edges: RFEdgeT[]) {
    this.edges = edges;
    this.geometry = null;
    this.viewportModel = null;
  }

  rebuildGeometry(
    flowNodes: RFNode[],
    nodeLookup: Map<string, InternalNode<Node>>,
  ): EdgeLayerModel | null {
    const boxes = boxesFromFlowNodes(flowNodes, nodeLookup);
    this.geometry = buildEdgeLayerModel(this.edges, boxes);
    if (this.lastViewport) {
      this.viewportModel = buildStaticEdgeModel(this.geometry, this.lastViewport);
    } else {
      this.viewportModel = null;
    }
    return this.geometry;
  }

  buildStaticModel(input: ViewportInput): ViewportEdgeModel | null {
    this.lastViewport = input;
    if (!this.geometry) return null;
    this.viewportModel = buildStaticEdgeModel(this.geometry, input);
    return this.viewportModel;
  }

  arrowLodFlipped(input: ViewportInput): boolean {
    if (!this.viewportModel) return false;
    const next = showArrowHeadsAtZoom(input.transform[2]);
    return next !== this.viewportModel.showArrows;
  }

  applyArrowLodFlip(input: ViewportInput): ViewportEdgeModel | null {
    if (!this.viewportModel || !this.arrowLodFlipped(input)) return null;
    this.lastViewport = input;
    const showArrows = showArrowHeadsAtZoom(input.transform[2]);
    this.viewportModel = { ...this.viewportModel, showArrows };
    return this.viewportModel;
  }

  getGeometry(): EdgeLayerModel | null {
    return this.geometry;
  }

  getViewportModel(): ViewportEdgeModel | null {
    return this.viewportModel;
  }
}
