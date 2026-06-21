import { describe, expect, it, beforeAll } from "vitest";
import goldenGraph from "./fixtures/golden/project-graph.json";
import { ElkLayoutEngine } from "../src/domain/layout";
import type { LayoutedGraph } from "../src/domain/layout";
import {
  projectGraph,
  importsOf,
  importedBy,
} from "../src/domain/graph";
import type { ProjectGraph } from "../src/domain/graph";

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

  it("marks a group collapsed when it is in the collapsed set", () => {
    const { nodes } = projectGraph(graph, layout, {
      collapsedGroupIds: new Set(["core"]),
    });
    const core = nodes.find((n) => n.id === "core");
    expect(core?.data.collapsed).toBe(true);
    const ui = nodes.find((n) => n.id === "ui");
    expect(ui?.data.collapsed).toBe(false);
  });

  it("attaches a source snippet to a module when provided", () => {
    const snippets = new Map([["src/services/http.ts", "export const x = 1;"]]);
    const { nodes } = projectGraph(graph, layout, { snippets });
    const http = nodes.find((n) => n.id === "src/services/http.ts");
    expect(http?.data.snippet).toBe("export const x = 1;");
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
});

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
