import { describe, expect, it } from "vitest";
import { styleEdge } from "../src/features/graph_canvas/Private/edges/edge-style";
import { buildEdgeLayerModel } from "../src/features/graph_canvas/Private/edges/edge-layer-cache";
import { boxesFromFlowNodes } from "../src/features/graph_canvas/Private/edges/node-boxes";
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

  describe("diff edge styling and focus dimming", () => {
    const diffAddedEdge = {
      id: "diff-added:e1",
      source: "a",
      target: "b",
      data: { diffState: "added" as const, isViolation: false, kind: "import" },
    };
    const diffRemovedEdge = {
      id: "diff-removed:e2",
      source: "c",
      target: "d",
      data: { diffState: "removed" as const, isViolation: false, kind: "import" },
    };
    const diffRenamedEdge = {
      id: "diff-renamed:e3",
      source: "old",
      target: "new",
      data: { diffState: "renamed" as const, isViolation: false, kind: "rename" },
    };
    const normalEdge = {
      id: "normal:e4",
      source: "a",
      target: "c",
      data: { isViolation: false, kind: "import" },
    };

    it("makes diff arrows thicker (2.8px) than focused reference edges (2px) and neutral edges (1.2px)", () => {
      const styledAdded = styleEdge(diffAddedEdge, null);
      const styledRemoved = styleEdge(diffRemovedEdge, null);
      const styledRenamed = styleEdge(diffRenamedEdge, null);
      const styledNormal = styleEdge(normalEdge, null);
      const styledFocusedNormal = styleEdge(normalEdge, "a");

      expect(styledAdded.style?.strokeWidth).toBe(2.8);
      expect(styledRemoved.style?.strokeWidth).toBe(2.8);
      expect(styledRenamed.style?.strokeWidth).toBe(2.8);
      expect(styledNormal.style?.strokeWidth).toBe(1.2);
      expect(styledFocusedNormal.style?.strokeWidth).toBe(2);
    });

    it("does not dim diff arrows when no module is selected", () => {
      const styledAdded = styleEdge(diffAddedEdge, null);
      const styledRemoved = styleEdge(diffRemovedEdge, null);
      const styledRenamed = styleEdge(diffRenamedEdge, null);

      expect(styledAdded.style?.opacity).toBe(1);
      expect(styledRemoved.style?.opacity).toBe(1);
      expect(styledRenamed.style?.opacity).toBe(1);
    });

    it("dims non-connected diff arrows when a module is selected, keeping connected diff arrows opaque", () => {
      const styledConnected = styleEdge(diffAddedEdge, "a");
      const styledTargetConnected = styleEdge(diffAddedEdge, "b");
      const styledUnconnected = styleEdge(diffAddedEdge, "c");

      expect(styledConnected.style?.opacity).toBe(1);
      expect(styledTargetConnected.style?.opacity).toBe(1);
      expect(styledUnconnected.style?.opacity).toBe(0.45);
    });

    it("preserves diff colors when connected to a focused module", () => {
      const styledAdded = styleEdge(diffAddedEdge, "a");
      const styledRemoved = styleEdge(diffRemovedEdge, "c");
      const styledRenamed = styleEdge(diffRenamedEdge, "new");

      expect(styledAdded.style?.stroke).toBe("#16a34a");
      expect(styledRemoved.style?.stroke).toBe("#dc2626");
      expect(styledRenamed.style?.stroke).toBe("#d97706");
    });
  });
});

