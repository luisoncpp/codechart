import { describe, expect, it } from "vitest";
import { projectGraph } from "../src/domain/graph";
import { styleEdge } from "../src/features/graph_canvas";
import { buildEdgeLayerModel } from "../src/features/graph_canvas/Private/edge-layer-cache";
import { boxesFromFlowNodes } from "../src/features/graph_canvas/Private/node-boxes";
import { GraphSessionStore } from "../src/state/graph-session";
import { ElkLayoutEngine } from "../src/domain/layout";
import { createMockAnalysisClient } from "../src/ipc/analysis-client";

async function readyProjected() {
  const store = new GraphSessionStore(
    createMockAnalysisClient(),
    new ElkLayoutEngine(),
  );
  await store.loadProject("/sample");
  const graph = store.getReducedGraph()!;
  const layout = store.getLayout()!;
  return projectGraph(graph, layout);
}

describe("edge layer integration data", () => {
  it("builds paths for the loaded golden graph", async () => {
    const projected = await readyProjected();
    const styled = projected.edges.map((e) => styleEdge(e, null));
    const lookup = new Map(
      projected.nodes.map((node) => [
        node.id,
        {
          id: node.id,
          width: node.width,
          height: node.height,
          measured: { width: node.width ?? 0, height: node.height ?? 0 },
          internals: {
            positionAbsolute: { x: node.position.x, y: node.position.y },
          },
        },
      ]),
    );

    const boxes = boxesFromFlowNodes(projected.nodes, lookup as never);
    const model = buildEdgeLayerModel(styled, boxes);

    expect(projected.edges.length).toBeGreaterThan(0);
    expect(boxes.size).toBeGreaterThan(0);
    expect(model).not.toBeNull();
    expect(model!.buckets.some((b) => b.segments.length > 0)).toBe(true);
  });
});
