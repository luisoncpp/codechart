import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import goldenGraph from "./fixtures/golden/project-graph.json";
import { GraphCanvas, edgeRole, styleEdge } from "../src/features/graph_canvas";
import { projectForZoom, topLevelGroupIds } from "../src/domain/graph";
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

  it("gives group nodes source+target handles so collapsed groups can be edge endpoints (L0)", async () => {
    // Regression: at L0 edges re-route onto group boxes; without handles React
    // Flow drops them (error #008) and the overview shows no edges at all.
    const { container } = render(<GraphCanvas store={store} />);
    await waitFor(() =>
      expect(container.querySelector(`[data-id="app"]`)).toBeTruthy(),
    );
    const group = container.querySelector(`[data-id="app"]`)!;
    expect(group.querySelector(".react-flow__handle.source")).toBeTruthy();
    expect(group.querySelector(".react-flow__handle.target")).toBeTruthy();
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

  it("renders exported symbols in module boxes at L1.5", async () => {
    await new Promise<void>((resolve) => {
      store.once("layout-changed", () => resolve());
      store.setZoomLevel(1.5);
    });
    const { container } = render(<GraphCanvas store={store} />);
    await waitFor(() =>
      expect(container.querySelector(`[data-id="src/core/store.ts"]`)).toBeTruthy(),
    );
    const node = container.querySelector(`[data-id="src/core/store.ts"]`)!;
    expect(node.textContent).toContain("TodoStore");
    expect(node.textContent).not.toContain("class TodoStore");
  });

  it("clicking a collapsed group at L0 selects it in the store", async () => {
    await new Promise<void>((resolve) => {
      store.once("layout-changed", () => resolve());
      store.setZoomLevel(0);
    });
    const { container } = render(<GraphCanvas store={store} />);
    await waitFor(() =>
      expect(container.querySelector(`[data-id="app"]`)).toBeTruthy(),
    );
    fireEvent.click(container.querySelector(`[data-id="app"]`)!);
    expect(store.getSelectedId()).toBe("app");
  });

  it("does not select an expanded group header (L1)", async () => {
    const { container } = render(<GraphCanvas store={store} />);
    await waitFor(() =>
      expect(container.querySelector(`[data-id="app"]`)).toBeTruthy(),
    );
    fireEvent.click(container.querySelector(`[data-id="app"]`)!);
    expect(store.getSelectedId()).toBeNull();
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

  it("keeps a collapsed group's in/out edges fully opaque at L0", () => {
    const reduced = projectForZoom(graph, new Set(topLevelGroupIds(graph)));
    const touchingApp = reduced.edges.find(
      (e) => e.source === "app" || e.target === "app",
    );
    expect(touchingApp).toBeDefined();
    const rfEdge = {
      id: touchingApp!.id,
      source: touchingApp!.source,
      target: touchingApp!.target,
      data: { isViolation: false, kind: "import" },
    };
    expect(styleEdge(rfEdge, "app").style?.opacity).toBe(1);
    expect(styleEdge(rfEdge, "no-such-id").style?.opacity).toBe(0.45);
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

  it("renders @Architecture metadata for an annotated module (Phase 10)", async () => {
    const store = await readyStore();
    store.select("src/services/http.ts"); // the fixture's annotated module
    render(<InspectionPanel store={store} />);
    expect(screen.getByText("Architecture")).toBeInTheDocument();
    expect(screen.getByText("HTTP transport")).toBeInTheDocument();
    expect(
      screen.getByText(/Single choke point for network access/),
    ).toBeInTheDocument();
  });

  it("omits the Architecture section for a module with no annotation", async () => {
    const store = await readyStore();
    store.select("src/ui/TodoItem.tsx"); // no annotation, and its group has one
    render(<InspectionPanel store={store} />);
    // The group (ui) is annotated, so the section shows the group block but the
    // module has no "This module" block.
    expect(screen.queryByText(/^This module/)).not.toBeInTheDocument();
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
    // store.ts emits to App.tsx (the event seam line).
    expect(
      within(events).getByText(new RegExp(`emits → ${soft.target}`)),
    ).toBeInTheDocument();

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
