import { vi } from "vitest";
import { EdgeLayerController } from "../../src/features/graph_canvas/Private/edges/edge-layer-controller";
import { drawStyleFromEdge, styleKeyFromDrawStyle } from "../../src/features/graph_canvas/Private/edges/edge-path";
import { styleEdge } from "../../src/features/graph_canvas/Private/edges/edge-style";
import type { RFEdgeT, RFNode } from "../../src/domain/graph";

export function stubRafQueue(): FrameRequestCallback[] {
  const rafQueue: FrameRequestCallback[] = [];
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    rafQueue.push(cb);
    return rafQueue.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  return rafQueue;
}

export function flushRaf(rafQueue: FrameRequestCallback[]): void {
  rafQueue[0]!(0);
}

function makeDom() {
  const domNode = document.createElement("div");
  const edgesRoot = document.createElement("div");
  edgesRoot.className = "react-flow__edges";
  domNode.appendChild(edgesRoot);
  return domNode;
}

function lookupFor(nodes: RFNode[]) {
  return new Map(
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
}

export interface FlushFixtureOpts {
  onViewportModel?: ReturnType<typeof vi.fn>;
  transform?: readonly [number, number, number];
  width?: number;
  height?: number;
  nodes?: RFNode[];
  edges?: RFEdgeT[];
}

export function setupFlushController(opts: FlushFixtureOpts = {}) {
  const onViewportModel = opts.onViewportModel ?? vi.fn();
  const rafQueue = stubRafQueue();
  const nodes = opts.nodes ?? [
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
  const edges = opts.edges ?? [
    styleEdge(
      { id: "e1", source: "a", target: "b", data: { isViolation: false, kind: "import" } },
      null,
    ),
  ];

  const controller = new EdgeLayerController({
    storeApi: {
      getState: () => ({
        domNode: makeDom(),
        nodeLookup: lookupFor(nodes),
        transform: opts.transform ?? ([0, 0, 1.4] as const),
        width: opts.width ?? 800,
        height: opts.height ?? 600,
      }),
    },
    onViewportModel,
    onEdgesRoot: vi.fn(),
    getEdges: () => edges,
    getNodes: () => nodes,
  });
  controller.rebuildFromGeometry();
  onViewportModel.mockClear();

  const strokePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  const setAttributeSpy = vi.spyOn(strokePath, "setAttribute");
  const bucketKey = styleKeyFromDrawStyle(drawStyleFromEdge(edges[0]!));
  controller.setBucketRefs(bucketKey, {
    strokePath,
    arrowGroup: document.createElementNS("http://www.w3.org/2000/svg", "g"),
    crossGroup: document.createElementNS("http://www.w3.org/2000/svg", "g"),
  });

  return { controller, rafQueue, onViewportModel, setAttributeSpy, edges, nodes };
}
