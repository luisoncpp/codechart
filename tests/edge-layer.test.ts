import { describe, expect, it } from "vitest";
import { styleEdge } from "../src/features/graph_canvas/Private/edge-style";
import { buildEdgeLayerModel } from "../src/features/graph_canvas/Private/edge-layer-cache";
import { boxesFromFlowNodes } from "../src/features/graph_canvas/Private/node-boxes";
import type { RFNode } from "../src/domain/graph";

describe("edge layer model", () => {
  it("builds visible segments from projected node dimensions", () => {
    const nodes = [
      {
        id: "a",
        type: "module",
        position: { x: 0, y: 0 },
        width: 100,
        height: 40,
        data: { label: "a", isFacade: false, language: "ts" },
      },
      {
        id: "b",
        type: "module",
        position: { x: 200, y: 0 },
        width: 100,
        height: 40,
        data: { label: "b", isFacade: false, language: "ts" },
      },
    ] satisfies RFNode[];

    const lookup = new Map(
      nodes.map((node) => [
        node.id,
        {
          id: node.id,
          width: node.width,
          height: node.height,
          measured: { width: node.width!, height: node.height! },
          internals: { positionAbsolute: { x: node.position.x, y: node.position.y } },
        },
      ]),
    );

    const boxes = boxesFromFlowNodes(nodes, lookup as never);
    const edges = [
      styleEdge(
        {
          id: "e1",
          source: "a",
          target: "b",
          data: { isViolation: false, kind: "import" },
        },
        null,
      ),
    ];
    const model = buildEdgeLayerModel(edges, boxes);

    expect(model).not.toBeNull();
    expect(model!.buckets[0]?.segments.length).toBe(1);
    expect(model!.buckets[0]?.segments[0]?.path).toMatch(/^M\d/);
  });
});
