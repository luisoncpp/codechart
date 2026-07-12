import { describe, expect, it, beforeAll } from "vitest";
import goldenGraph from "./fixtures/golden/project-graph.json";
import { ElkLayoutEngine } from "../src/domain/layout";
import type { LayoutedGraph } from "../src/domain/layout";
import {
  projectGraph,
  importsOf,
  importedBy,
  allGroupIds,
  projectForZoom,
  computeHeatProjection,
} from "../src/domain/graph";
import type { ProjectGraph } from "../src/domain/graph";
import { collapsedDescription } from "../src/features/graph_canvas/Private/collapsed-description";

const graph = goldenGraph as unknown as ProjectGraph;
let layout: LayoutedGraph;

beforeAll(async () => {
  layout = await new ElkLayoutEngine().layout(graph);
});

describe("GraphProjector → React Flow models", () => {
  it("projects one node per group and module", () => {
    const { nodes } = projectGraph(graph, layout);
    const groups = nodes.filter((n) => n.type === "group");
    const modules = nodes.filter((n) => n.type === "module");
    expect(groups).toHaveLength(graph.groups.length);
    expect(modules).toHaveLength(graph.modules.length);
  });

  it("projects one edge per graph edge", () => {
    const { edges } = projectGraph(graph, layout);
    expect(edges).toHaveLength(graph.edges.length);
  });

  it("parents precede their children in the node array", () => {
    const { nodes } = projectGraph(graph, layout);
    const seen = new Set<string>();
    for (const node of nodes) {
      if (node.parentId) expect(seen.has(node.parentId)).toBe(true);
      seen.add(node.id);
    }
  });

  it("child positions are relative to their parent box", () => {
    const { nodes } = projectGraph(graph, layout);
    const child = nodes.find((n) => n.type === "module" && n.parentId);
    expect(child).toBeDefined();
    // Relative coords are smaller than the absolute layout box.
    const box = layout.modules.find((m) => m.id === child!.id)!;
    expect(child!.position.x).toBeLessThan(box.x);
  });

  it("carries the group color into node data", () => {
    const { nodes } = projectGraph(graph, layout);
    const group = nodes.find((n) => n.type === "group");
    expect(group?.data.color).toMatch(/^#/);
  });

  it("tints a grouped module with its owning group's color", () => {
    const { nodes } = projectGraph(graph, layout);
    const child = nodes.find((n) => n.type === "module" && n.parentId)!;
    const parent = nodes.find((n) => n.id === child.parentId)!;
    expect(child.data.color).toBe(parent.data.color);
  });

  it("retargets external facade in-edges to the group border (Idea 2)", () => {
    const facade = graph.modules.find((m) => m.isFacade && m.groupId)!;
    const external = graph.edges.find((e) => {
      const src = graph.modules.find((m) => m.id === e.source);
      return e.target === facade.id && src?.groupId !== facade.groupId;
    })!;
    const { edges } = projectGraph(graph, layout);
    const projected = edges.find((e) => e.id === external.id)!;
    expect(projected.data?.groupTargetId).toBe(facade.groupId);
  });

  it("leaves internal (same-group) facade edges anchored on the box", () => {
    const internal = graph.edges.find((e) => {
      const src = graph.modules.find((m) => m.id === e.source);
      const tgt = graph.modules.find((m) => m.id === e.target);
      return tgt?.isFacade && src?.groupId && src.groupId === tgt.groupId;
    });
    if (!internal) return; // golden may have none; assertion is conditional
    const { edges } = projectGraph(graph, layout);
    const projected = edges.find((e) => e.id === internal.id)!;
    expect(projected.data?.groupTargetId).toBeUndefined();
  });
});

describe("render options (Phase 10 metadata + zoom)", () => {
  it("threads annotation descriptionShort into group node data", () => {
    const { nodes } = projectGraph(graph, layout);
    const core = nodes.find((n) => n.id === "core");
    expect(core?.data.descriptionShort).toBe("Domain types & state");
  });

  it("threads descriptionLong + showLong (L1.5+) into group node data", () => {
    const short = projectGraph(graph, layout).nodes.find((n) => n.id === "core");
    expect(short?.data.descriptionLong).toContain("Domain model");
    expect(short?.data.showLong).toBe(false);
    const long = projectGraph(graph, layout, { showSymbols: true }).nodes.find(
      (n) => n.id === "core",
    );
    expect(long?.data.showLong).toBe(true);
  });

  it("threads heat scores onto group and module nodes", () => {
    const withMetrics: ProjectGraph = {
      ...graph,
      modules: graph.modules.map((m) =>
        m.id === "src/core/store.ts"
          ? { ...m, metrics: { ...m.metrics, churn: 12 } }
          : m,
      ),
    };
    const ids = new Set(withMetrics.modules.map((m) => m.id));
    const heat = { ...computeHeatProjection(withMetrics, "activity", ids), mode: "activity" as const };
    const { nodes } = projectGraph(withMetrics, layout, { heat });
    const coreGroup = nodes.find((n) => n.id === "core");
    const store = nodes.find((n) => n.id === "src/core/store.ts");
    expect(coreGroup?.data.heatVisible).toBe(true);
    expect(coreGroup?.data.heatMode).toBe("activity");
    expect(store?.data.heatVisible).toBe(true);
  });

  it("marks every node heatmapActive while the overlay is on", () => {
    const ids = new Set(graph.modules.map((m) => m.id));
    const heat = { ...computeHeatProjection(graph, "activity", ids), mode: "activity" as const };
    const { nodes } = projectGraph(graph, layout, { heat });
    const module = nodes.find((n) => n.id === "src/core/store.ts");
    expect(module?.data.heatmapActive).toBe(true);
    expect(module?.data.heatScore).toBe(0);
    expect(module?.data.heatVisible).toBe(true);
  });

  it("raises the description box to the content top when its column is clear", () => {
    const { graph: g, layout: l } = sceneWithDescription(/*moduleAboveDesc=*/ false);
    const grp = projectGraph(g, l).nodes.find((n) => n.id === "g")!;
    // No module above it → pulled up to group content top (padding + header = 42).
    expect(grp.data.descriptionBox?.y).toBe(42);
  });

  it("does not raise the description box over a module ELK placed above it", () => {
    const { graph: g, layout: l } = sceneWithDescription(/*moduleAboveDesc=*/ true);
    const grp = projectGraph(g, l).nodes.find((n) => n.id === "g")!;
    const d = grp.data.descriptionBox!;
    // Module m sits at y=42 h=90 sharing the desc's x-span → desc lands below it, no overlap.
    expect(d.y).toBeGreaterThanOrEqual(42 + 90);
    expect(d.y).toBeLessThanOrEqual(300); // never pushed below its reserved slot
  });

  it("marks a group collapsed when it is in the collapsed set", () => {
    const { nodes } = projectGraph(graph, layout, {
      collapsedGroupIds: new Set(["core"]),
    });
    const core = nodes.find((n) => n.id === "core");
    expect(core?.data.collapsed).toBe(true);
    const ui = nodes.find((n) => n.id === "ui");
    expect(ui?.data.collapsed).toBe(false);
  });

  it("populates minChildY correctly based on child boxes", () => {
    const g = {
      root: "/x",
      groups: [
        {
          id: "g",
          label: "G",
          parentId: null,
          facadeModuleIds: [],
        },
      ],
      modules: [
        {
          id: "m",
          path: "m.ts",
          label: "m.ts",
          language: "ts",
          groupId: "g",
          isFacade: false,
          metrics: { loc: 1 },
          exportedSymbols: [],
        },
      ],
      edges: [],
      diagnostics: [],
    } as unknown as ProjectGraph;

    const l = {
      groups: [{ id: "g", parentId: null, x: 0, y: 100, width: 400, height: 400 }],
      modules: [{ id: "m", parentId: "g", x: 10, y: 150, width: 100, height: 100 }],
      symbols: [],
      descriptions: [],
      width: 400,
      height: 400,
    } as LayoutedGraph;

    const { nodes } = projectGraph(g, l);
    const grp = nodes.find((n) => n.id === "g")!;
    expect(grp.data.minChildY).toBe(50);
  });

  it("hides modules under a collapsed group even when the layout still has their boxes", () => {
    const collapsed = new Set(allGroupIds(graph));
    const { nodes } = projectGraph(graph, layout, { collapsedGroupIds: collapsed });
    const modules = nodes.filter((n) => n.type === "module");
    expect(modules.map((n) => n.id)).toEqual(["src/main.ts"]);
  });

  it("attaches a source snippet to a module when provided", () => {
    const snippets = new Map([["src/services/http.ts", "export const x = 1;"]]);
    const { nodes } = projectGraph(graph, layout, { snippets });
    const http = nodes.find((n) => n.id === "src/services/http.ts");
    expect(http?.data.snippet).toBe("export const x = 1;");
  });

  it("threads architectureDoc content into group node data at L2", () => {
    const withDoc: ProjectGraph = {
      ...graph,
      groups: graph.groups.map((g) =>
        g.id === "core"
          ? { ...g, architectureDoc: "docs/architecture/contract.md" }
          : g,
      ),
    };
    const groupDocs = new Map([["core", "# Contract\n\nBody text."]]);
    const { nodes } = projectGraph(withDoc, layout, { groupDocs, showSymbols: true });
    const core = nodes.find((n) => n.id === "core");
    expect(core?.data.architectureDoc).toBe("docs/architecture/contract.md");
    expect(core?.data.architectureDocContent).toBe("# Contract\n\nBody text.");
  });

  it("attaches descriptionLong, path, and snippet and hides symbols at L2", () => {
    const snippets = new Map([["src/services/http.ts", "export const x = 1;"]]);
    const { nodes } = projectGraph(graph, layout, { showSymbols: true, snippets });
    const http = nodes.find((n) => n.id === "src/services/http.ts");
    expect(http?.data.snippet).toBe("export const x = 1;");
    expect(http?.data.path).toBe("src/services/http.ts");
    expect(http?.data.descriptionLong).toBeDefined();

    // Verify symbols are hidden when snippets (L2 mode) is active
    const symbols = nodes.filter((n) => n.type === "symbol");
    expect(symbols.length).toBe(0);
  });

  it("attaches exported symbols when showSymbols is set (L1.5)", () => {
    const { nodes } = projectGraph(graph, layout, { showSymbols: true });
    const symbols = nodes.filter((n) => n.type === "symbol");
    expect(symbols.length).toBeGreaterThan(0);
    const httpSymbol = nodes.find((n) => n.id === "src/services/http.ts::getJson");
    expect(httpSymbol?.type).toBe("symbol");
    expect(httpSymbol?.parentId).toBe("src/services/http.ts");
    expect(httpSymbol?.data.label).toBe("getJson");
    expect(httpSymbol?.data.kind).toBe("function");
    const appSymbol = nodes.find((n) => n.id === "src/ui/App.tsx::App");
    expect(appSymbol?.data.kind).toBe("component");
    const coreSymbols = symbols.filter((n) => n.parentId === "src/core/index.ts");
    expect(coreSymbols.map((n) => n.data.label).sort()).toEqual([
      "Todo",
      "TodoStore",
      "isValid",
    ]);
  });

  it("does not throw an error when showSymbols is set and some groups are collapsed", () => {
    const collapsed = new Set(["core"]);
    const reducedGraph = projectForZoom(graph, collapsed);
    expect(() => {
      projectGraph(reducedGraph, layout, { showSymbols: true, collapsedGroupIds: collapsed });
    }).not.toThrow();
  });
});

describe("collapsedDescription fallback and clamping logic", () => {
  it("prefers long description if it fits", () => {
    const data = {
      label: "G",
      color: "#ff0000",
      descriptionShort: "short text",
      descriptionLong: "This is a very long description that should fit in a large box.",
      minChildY: 200,
    };
    const desc = collapsedDescription(data, 1, { width: 300, height: 168 });
    expect(desc?.text).toBe(data.descriptionLong);
  });

  it("falls back to short description if long description does not fit", () => {
    const data = {
      label: "G",
      color: "#ff0000",
      descriptionShort: "short text",
      descriptionLong: "This is a very long description that will definitely not fit in a small constrained box.",
      minChildY: 80,
    };
    const desc = collapsedDescription(data, 1, { width: 300, height: 168 });
    expect(desc?.text).toBe(data.descriptionShort);
  });

  it("returns null if even the short description does not fit", () => {
    const data = {
      label: "G",
      color: "#ff0000",
      descriptionShort: "short text",
      minChildY: 25,
    };
    const desc = collapsedDescription(data, 1, { width: 300, height: 168 });
    expect(desc).toBeNull();
  });
});

describe("L0 collapsed-card description layout (regression)", () => {
  const LONG =
    "Compares before/after ProjectGraph snapshots, parses unified diffs into " +
    "per-module overlays, and stamps diff states onto nodes and edges for render.";

  it("ignores hidden module boxes when computing minChildY for a collapsed group", () => {
    const { graph: g, layout: l } = sceneWithSubgroup(/*withSubgroup=*/ false);
    const { nodes } = projectGraph(g, l, { collapsedGroupIds: new Set(["g"]) });
    const grp = nodes.find((n) => n.id === "g")!;
    // The module box still exists in the (full-graph) layout but is not visible
    // at L0 — it must not clamp the card description.
    expect(grp.data.minChildY).toBeUndefined();
  });

  it("clamps to a visible nested subgroup and exposes its left edge as minChildX", () => {
    const { graph: g, layout: l } = sceneWithSubgroup(/*withSubgroup=*/ true);
    const { nodes } = projectGraph(g, l, {
      collapsedGroupIds: new Set(["g", "sub"]),
    });
    const grp = nodes.find((n) => n.id === "g")!;
    expect(grp.data.minChildY).toBe(60);
    expect(grp.data.minChildX).toBe(200);
    expect(grp.data.childObstacles).toEqual([
      { x: 200, y: 60, width: 300, height: 200 },
    ]);
  });

  it("hands the render its measured width so fit math and style agree", () => {
    const data = {
      label: "G",
      color: "#ff0000",
      descriptionShort: "short text",
      descriptionLong: LONG,
    };
    // Wide card, counter-scaled font (L0). The long text fits at the full card
    // width — the view must render at that width, not an unscaled 340px cap.
    const desc = collapsedDescription(data, 3, { width: 900, height: 500 });
    expect(desc?.text).toBe(LONG);
    expect(desc?.width).toBe(900 - 32);
  });

  it("grows the font when the region has plenty of spare space", () => {
    const data = {
      label: "G",
      color: "#ff0000",
      descriptionShort: "short text",
    };
    const desc = collapsedDescription(data, 1, { width: 800, height: 800 });
    // Ten characters in a huge empty card → font grows to the cap.
    expect(desc?.font).toBe(28);
  });

  it("keeps the base font when the text barely fits", () => {
    const data = {
      label: "G",
      color: "#ff0000",
      // 400 chars: fits the 300×300 card's region at 14px (capacity 432) but
      // not at 15px (capacity 374) → the font must not grow.
      descriptionLong: "a".repeat(400),
      descriptionShort: "short",
    };
    const desc = collapsedDescription(data, 1, { width: 300, height: 300 });
    expect(desc?.text).toBe(data.descriptionLong);
    expect(desc?.font).toBe(14);
  });

  it("counter-scales the grown font like the base one", () => {
    const data = {
      label: "G",
      color: "#ff0000",
      descriptionShort: "short text",
    };
    const desc = collapsedDescription(data, 2, { width: 1600, height: 1600 });
    expect(desc?.font).toBe(28 * 2);
  });

  it("shows the short text in the top-left gap between a low-left and high-right subgroup", () => {
    // The screenshot scene (Tauri Backend / Language Adapter): one subgroup low
    // on the left, another high on the right. The independent minima describe
    // no free space (minChildY from the right child, minChildX from the left
    // one), but the top-left rectangle between them fits the short blurb.
    const data = {
      label: "Tauri backend",
      color: "#ef4444",
      descriptionShort: "Rust analysis backend",
      minChildX: 16,
      minChildY: 40,
      childObstacles: [
        { x: 16, y: 260, width: 300, height: 120 },
        { x: 360, y: 40, width: 320, height: 340 },
      ],
    };
    const desc = collapsedDescription(data, 1, { width: 700, height: 400 });
    expect(desc?.text).toBe("Rust analysis backend");
    // Rendered width must stop left of the high-right subgroup.
    expect(desc!.width).toBeLessThanOrEqual(360 - 16 - 12);
  });

  it("flows into the free left column when a subgroup starts at the header", () => {
    const data = {
      label: "G",
      color: "#ff0000",
      descriptionShort: "short text",
      descriptionLong: LONG,
      minChildY: 60,
      minChildX: 160,
    };
    const desc = collapsedDescription(data, 1, { width: 480, height: 400 });
    // The band above the subgroup is ~0 lines tall, but the column left of it
    // holds the whole long text.
    expect(desc?.text).toBe(LONG);
    expect(desc!.width).toBeLessThanOrEqual(160);
    expect(desc!.lines).toBeGreaterThan(3);
  });
});

/** A group with a hidden-at-L0 module near its top, optionally plus a visible
 *  nested subgroup at (200, 60) — the minChildY/minChildX visibility scene. */
function sceneWithSubgroup(withSubgroup: boolean): {
  graph: ProjectGraph;
  layout: LayoutedGraph;
} {
  const g = {
    root: "/x",
    groups: [
      { id: "g", label: "G", parentId: null, facadeModuleIds: [] },
      ...(withSubgroup
        ? [{ id: "sub", label: "Sub", parentId: "g", facadeModuleIds: [] }]
        : []),
    ],
    modules: [
      {
        id: "m",
        path: "m.ts",
        label: "m.ts",
        language: "ts",
        groupId: "g",
        isFacade: false,
        metrics: { loc: 1 },
        exportedSymbols: [],
      },
    ],
    edges: [],
    diagnostics: [],
  } as unknown as ProjectGraph;
  const layout = {
    groups: [
      { id: "g", parentId: null, x: 0, y: 100, width: 600, height: 400 },
      ...(withSubgroup
        ? [{ id: "sub", parentId: "g", x: 200, y: 160, width: 300, height: 200 }]
        : []),
    ],
    modules: [{ id: "m", parentId: "g", x: 10, y: 150, width: 100, height: 100 }],
    symbols: [],
    descriptions: [],
    width: 600,
    height: 400,
  } as LayoutedGraph;
  return { graph: g, layout };
}

/** A one-group/one-module scene with the description box reserved low (as ELK's
 *  centering does). `moduleAboveDesc` decides whether the module shares the desc's
 *  x-span at the top, so the collision-avoidance branch is exercised both ways. */
function sceneWithDescription(moduleAboveDesc: boolean): {
  graph: ProjectGraph;
  layout: LayoutedGraph;
} {
  const g = {
    root: "/x",
    groups: [
      {
        id: "g",
        label: "G",
        parentId: null,
        facadeModuleIds: [],
        annotation: { descriptionShort: "short", descriptionLong: "long prose here" },
      },
    ],
    modules: [
      {
        id: "m",
        path: "m.ts",
        label: "m.ts",
        language: "ts",
        groupId: "g",
        isFacade: false,
        metrics: { loc: 1 },
        exportedSymbols: [],
      },
    ],
    edges: [],
    diagnostics: [],
  } as unknown as ProjectGraph;
  const moduleX = moduleAboveDesc ? 12 : 260; // share desc's x-span, or sit in another column
  const layout = {
    groups: [{ id: "g", parentId: null, x: 0, y: 0, width: 420, height: 600 }],
    modules: [{ id: "m", parentId: "g", x: moduleX, y: 42, width: 120, height: 90 }],
    symbols: [],
    descriptions: [{ id: "g::__description__", parentId: "g", x: 12, y: 300, width: 200, height: 150 }],
    width: 420,
    height: 600,
  } as LayoutedGraph;
  return { graph: g, layout };
}

describe("selectors", () => {
  it("imports/imported-by are inverse views of the edge list", () => {
    const target = graph.edges[0].target;
    const incoming = importedBy(graph, target);
    expect(incoming.length).toBeGreaterThan(0);
    for (const e of incoming) expect(e.target).toBe(target);

    const source = graph.edges[0].source;
    for (const e of importsOf(graph, source)) expect(e.source).toBe(source);
  });
});
