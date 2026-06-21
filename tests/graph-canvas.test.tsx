import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import goldenGraph from "./fixtures/golden/project-graph.json";
import { GraphCanvas, edgeRole, styleEdge } from "../src/features/graph_canvas";
import { InspectionPanel } from "../src/features/inspection_panel";
import { GraphSessionStore } from "../src/state/graph-session";
import { ElkLayoutEngine } from "../src/domain/layout";
import { createMockAnalysisClient } from "../src/ipc/analysis-client";
import type { ProjectGraph } from "../src/domain/graph";

const graph = goldenGraph as unknown as ProjectGraph;

async function readyStore(): Promise<GraphSessionStore> {
  const store = new GraphSessionStore(
    createMockAnalysisClient(),
    new ElkLayoutEngine(),
  );
  await store.loadProject("/sample");
  return store;
}

describe("GraphCanvas", () => {
  let store: GraphSessionStore;
  beforeEach(async () => {
    store = await readyStore();
  });

  it("renders one React Flow node per group and module", async () => {
    const { container } = render(<GraphCanvas store={store} />);
    await waitFor(() => {
      const nodes = container.querySelectorAll(".react-flow__node");
      expect(nodes).toHaveLength(graph.groups.length + graph.modules.length);
    });
  });

  it("mounts the edge layer (edge counts covered by the projection test)", async () => {
    const { container } = render(<GraphCanvas store={store} />);
    await waitFor(() =>
      expect(container.querySelector(".react-flow__edges")).toBeTruthy(),
    );
  });

  it("clicking a module selects it in the store", async () => {
    const { container } = render(<GraphCanvas store={store} />);
    await waitFor(() =>
      expect(container.querySelector(".react-flow__node")).toBeTruthy(),
    );
    const facade = graph.modules.find((m) => m.isFacade)!;
    const node = container.querySelector(`[data-id="${facade.id}"]`)!;
    fireEvent.click(node);
    expect(store.getSelectedId()).toBe(facade.id);
  });
});

describe("edgeRole (selection-aware coloring)", () => {
  const src = graph.edges[0].source;
  const tgt = graph.edges[0].target;
  const rfEdge = {
    id: "e",
    source: src,
    target: tgt,
    data: { isViolation: false, kind: "import" },
  };

  it("marks edges leaving the selected module as imports (orange)", () => {
    expect(edgeRole(rfEdge, src)).toBe("import");
  });

  it("marks edges entering the selected module as exports (blue)", () => {
    expect(edgeRole(rfEdge, tgt)).toBe("export");
  });

  it("falls back to neutral when the edge does not touch the selection", () => {
    expect(edgeRole(rfEdge, "no-such-id")).toBe("neutral");
  });

  it("is neutral when nothing is selected", () => {
    expect(edgeRole(rfEdge, null)).toBe("neutral");
  });

  it("selection role wins over a violation edge", () => {
    expect(edgeRole({ ...rfEdge, data: { isViolation: true, kind: "import" } }, src)).toBe(
      "import",
    );
  });
});

describe("styleEdge (focus + context dimming)", () => {
  const src = graph.edges[0].source;
  const tgt = graph.edges[0].target;
  const rfEdge = {
    id: "e",
    source: src,
    target: tgt,
    data: { isViolation: false, kind: "import" },
  };

  it("routes every edge through the floating edge type", () => {
    expect(styleEdge(rfEdge, null).type).toBe("floating");
  });

  it("keeps the selected module's own edges fully opaque", () => {
    expect(styleEdge(rfEdge, src).style?.opacity).toBe(1);
  });

  it("dims unrelated edges to one quiet level — selected or not", () => {
    const baseline = styleEdge(rfEdge, null).style?.opacity;
    const whileFocusing = styleEdge(rfEdge, "no-such-id").style?.opacity;
    expect(baseline).toBe(0.45);
    expect(whileFocusing).toBe(0.45); // single level, not a deeper fade
  });

  it("keeps arrowheads on every edge (no de-arrowing)", () => {
    expect(styleEdge(rfEdge, "no-such-id").markerEnd).toBeDefined();
  });
});

describe("InspectionPanel", () => {
  it("shows imports and imported-by for the selected module", async () => {
    const store = await readyStore();
    const edge = graph.edges[0];
    store.select(edge.source);
    render(<InspectionPanel store={store} />);

    const imports = screen.getByText(/^Imports/).closest("div")!;
    expect(within(imports).getByText(edge.target)).toBeInTheDocument();
  });

  it("prompts to select a module when nothing is selected", async () => {
    const store = await readyStore();
    render(<InspectionPanel store={store} />);
    expect(screen.getByText(/Select a module/)).toBeInTheDocument();
  });

  it("explains the facade bypass on the violating module (Phase 8)", async () => {
    const store = await readyStore();
    const violation = graph.edges.find((e) => e.isViolation)!;
    store.select(violation.source); // src/ui/TodoList.tsx
    render(<InspectionPanel store={store} />);

    const message = screen.getByText(/bypassing the core facade/);
    expect(message).toBeInTheDocument();
    expect(message).toHaveStyle({ color: "#dc2626" }); // red, matches the edge
  });
});

describe("soft edges (Phase 9)", () => {
  const soft = graph.edges.find((e) => e.kind === "soft")!;

  it("renders soft edges dashed; import edges are not dashed", () => {
    const rfSoft = {
      id: soft.id,
      source: soft.source,
      target: soft.target,
      data: { isViolation: false, kind: "soft" },
    };
    const rfImport = { ...rfSoft, id: "i", data: { isViolation: false, kind: "import" } };
    expect(styleEdge(rfSoft, null).style?.strokeDasharray).toBe("6 4");
    expect(styleEdge(rfImport, null).style?.strokeDasharray).toBeUndefined();
  });

  it("lists the event seam under Events and keeps it out of Imports", async () => {
    const store = await readyStore();
    store.select(soft.source); // src/core/store.ts (the emitter)
    render(<InspectionPanel store={store} />);

    const events = screen.getByText(/^Events/).closest("div")!;
    expect(within(events).getByText(new RegExp(soft.target))).toBeInTheDocument();

    const imports = screen.getByText(/^Imports/).closest("div")!;
    expect(within(imports).queryByText(soft.target)).not.toBeInTheDocument();
  });
});

describe("violation edge styling (Phase 8)", () => {
  it("renders the bypass edge red when nothing is selected", () => {
    const violation = graph.edges.find((e) => e.isViolation)!;
    const rfEdge = {
      id: violation.id,
      source: violation.source,
      target: violation.target,
      data: { isViolation: true, kind: "import" },
    };
    expect(edgeRole(rfEdge, null)).toBe("violation");
    expect(styleEdge(rfEdge, null).style?.stroke).toBe("#dc2626");
  });
});
