import { describe, expect, it } from "vitest";
import { EdgeLayerRenderer } from "../src/features/graph_canvas/Private/edges/edge-layer-renderer";
import { styleEdge } from "../src/features/graph_canvas/Private/edges/edge-style";
import type { RFNode } from "../src/domain/graph";

function node(id: string, x: number, y: number): RFNode {
  return {
    id,
    type: "module",
    position: { x, y },
    width: 100,
    height: 40,
    data: { label: id, isFacade: false, language: "ts" },
  };
}

function lookupFor(nodes: RFNode[]) {
  return new Map(
    nodes.map((n) => [
      n.id,
      {
        id: n.id,
        width: n.width,
        height: n.height,
        measured: { width: n.width!, height: n.height! },
        internals: { positionAbsolute: { x: n.position.x, y: n.position.y } },
      },
    ]),
  );
}

describe("EdgeLayerRenderer viewport", () => {
  it("keeps full geometry segment count after rebuildGeometry", () => {
    const nodes = [node("a", 0, 0), node("b", 200, 0)];
    const edges = [
      styleEdge(
        { id: "e1", source: "a", target: "b", data: { isViolation: false, kind: "import" } },
        null,
      ),
    ];
    const renderer = new EdgeLayerRenderer();
    renderer.setEdges(edges);
    renderer.rebuildGeometry(nodes, lookupFor(nodes) as never);

    const geometry = renderer.getGeometry();
    expect(geometry).not.toBeNull();
    const total = geometry!.buckets.reduce((n, b) => n + b.segments.length, 0);
    expect(total).toBe(1);
  });

  it("buildStaticModel draw model drops far edge on small viewport", () => {
    const nodes = [node("a", 0, 0), node("b", 50, 0), node("c", 2000, 2000), node("d", 2100, 2000)];
    const edges = [
      styleEdge(
        { id: "e1", source: "a", target: "b", data: { isViolation: false, kind: "import" } },
        null,
      ),
      styleEdge(
        { id: "e2", source: "c", target: "d", data: { isViolation: false, kind: "import" } },
        null,
      ),
    ];
    const renderer = new EdgeLayerRenderer();
    renderer.setEdges(edges);
    renderer.rebuildGeometry(nodes, lookupFor(nodes) as never);

    const geometryTotal = renderer.getGeometry()!.buckets.reduce(
      (n, b) => n + b.segments.length,
      0,
    );
    const model = renderer.buildStaticModel({
      transform: [0, 0, 1.5],
      width: 120,
      height: 80,
    });
    const bucketArrowCount = model!.buckets.reduce(
      (n, b) => n + b.arrowSegments.length,
      0,
    );

    expect(geometryTotal).toBe(2);
    expect(bucketArrowCount).toBe(1);
    expect(model!.buckets[0]?.mergedPath.length).toBeGreaterThan(0);
  });

  it("clipCellChanged after large pan and rebuildClippedModel updates mergedPath", () => {
    const nodes = [node("a", 0, 0), node("b", 200, 0), node("c", 2000, 0), node("d", 2200, 0)];
    const edges = [
      styleEdge(
        { id: "e1", source: "a", target: "b", data: { isViolation: false, kind: "import" } },
        null,
      ),
      styleEdge(
        { id: "e2", source: "c", target: "d", data: { isViolation: false, kind: "import" } },
        null,
      ),
    ];
    const renderer = new EdgeLayerRenderer();
    renderer.setEdges(edges);
    renderer.rebuildGeometry(nodes, lookupFor(nodes) as never);

    const nearVp = { transform: [0, 0, 1], width: 400, height: 300 };
    const nearModel = renderer.buildStaticModel(nearVp);
    const nearPath = nearModel!.buckets[0]?.mergedPath;

    const farVp = { transform: [-1800, 0, 1], width: 400, height: 300 };
    expect(renderer.clipCellChanged(farVp)).toBe(true);
    const farModel = renderer.rebuildClippedModel(farVp);
    expect(farModel!.buckets[0]?.mergedPath).not.toBe(nearPath);
  });

  it("arrowLodFlipped is false when only pan changes transform", () => {
    const nodes = [node("a", 0, 0), node("b", 200, 0)];
    const edges = [
      styleEdge(
        { id: "e1", source: "a", target: "b", data: { isViolation: false, kind: "import" } },
        null,
      ),
    ];
    const renderer = new EdgeLayerRenderer();
    renderer.setEdges(edges);
    renderer.rebuildGeometry(nodes, lookupFor(nodes) as never);
    renderer.buildStaticModel({ transform: [0, 0, 1.5], width: 800, height: 600 });

    expect(
      renderer.arrowLodFlipped({ transform: [50, 100, 1.5], width: 800, height: 600 }),
    ).toBe(false);
  });

  it("arrowLodFlipped is true when zoom crosses 1.5 threshold", () => {
    const nodes = [node("a", 0, 0), node("b", 200, 0)];
    const edges = [
      styleEdge(
        { id: "e1", source: "a", target: "b", data: { isViolation: false, kind: "import" } },
        null,
      ),
    ];
    const renderer = new EdgeLayerRenderer();
    renderer.setEdges(edges);
    renderer.rebuildGeometry(nodes, lookupFor(nodes) as never);
    renderer.buildStaticModel({ transform: [0, 0, 1.4], width: 800, height: 600 });

    expect(
      renderer.arrowLodFlipped({ transform: [0, 0, 1.5], width: 800, height: 600 }),
    ).toBe(true);
  });
});
