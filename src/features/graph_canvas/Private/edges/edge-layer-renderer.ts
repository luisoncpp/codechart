// @Architecture(descriptionShort="Builds the edge layer model from flow nodes")
import type { InternalNode, Node } from "@xyflow/react";
import type { RFEdgeT, RFNode } from "../../../../domain/graph";
import { showArrowHeadsAtZoom } from "./edge-arrow-zoom";
import { buildEdgeLayerModel, type EdgeLayerModel } from "./edge-layer-cache";
import { boxesFromFlowNodes } from "./node-boxes";
import {
  clipCellKey,
  type ViewportInput,
  visibleWorldRect,
} from "./edge-viewport";
import {
  buildStaticEdgeModel,
  type ViewportEdgeModel,
} from "./viewport-edge-model";

export class EdgeLayerRenderer {
  private edges: RFEdgeT[] = [];
  private geometry: EdgeLayerModel | null = null;
  private viewportModel: ViewportEdgeModel | null = null;
  private lastViewport: ViewportInput | null = null;
  private lastClipCellKey: string | null = null;

  setEdges(edges: RFEdgeT[]) {
    this.edges = edges;
    this.geometry = null;
    this.viewportModel = null;
    this.lastClipCellKey = null;
  }

  rebuildGeometry(
    flowNodes: RFNode[],
    nodeLookup: Map<string, InternalNode<Node>>,
  ): EdgeLayerModel | null {
    const boxes = boxesFromFlowNodes(flowNodes, nodeLookup);
    this.geometry = buildEdgeLayerModel(this.edges, boxes);
    if (this.lastViewport) this.rebuildClippedModel(this.lastViewport);
    else this.viewportModel = null;
    return this.geometry;
  }

  clipCellChanged(input: ViewportInput): boolean {
    return this.lastClipCellKey !== clipCellKey(visibleWorldRect(input));
  }

  rebuildClippedModel(input: ViewportInput): ViewportEdgeModel | null {
    this.lastViewport = input;
    this.lastClipCellKey = clipCellKey(visibleWorldRect(input));
    if (!this.geometry) {
      this.viewportModel = null;
      return null;
    }
    this.viewportModel = buildStaticEdgeModel(this.geometry, input);
    return this.viewportModel;
  }

  buildStaticModel(input: ViewportInput): ViewportEdgeModel | null {
    return this.rebuildClippedModel(input);
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
