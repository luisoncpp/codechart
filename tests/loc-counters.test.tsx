import { describe, expect, it } from "vitest";
import { act, waitFor } from "@testing-library/react";
import goldenGraph from "./fixtures/golden/project-graph.json";
import { ElkLayoutEngine } from "../src/domain/layout";
import { groupLocTotals, formatLoc, projectGraph } from "../src/domain/graph";
import type { ProjectGraph } from "../src/domain/graph";
import { readyGraphStore, renderGraphCanvas } from "./helpers/flow-graph-canvas";

const graph = goldenGraph as unknown as ProjectGraph;

// Golden fixture LOC: core 3+27+6, services 12+6+2, ui 15+6+15+3, shared 10+14.
const CORE_LOC = 36;
const APP_LOC = CORE_LOC + 20 + 39;

describe("groupLocTotals", () => {
  it("sums the LOC of a group's own modules", () => {
    expect(groupLocTotals(graph).get("core")).toBe(CORE_LOC);
    expect(groupLocTotals(graph).get("shared")).toBe(24);
  });

  it("rolls nested group totals up into every ancestor", () => {
    expect(groupLocTotals(graph).get("app")).toBe(APP_LOC);
  });

  it("counts only the visible modules when a set is given", () => {
    const visible = new Set(
      graph.modules.map((m) => m.id).filter((id) => id !== "src/core/store.ts"),
    );
    const totals = groupLocTotals(graph, visible);
    expect(totals.get("core")).toBe(CORE_LOC - 27);
    expect(totals.get("app")).toBe(APP_LOC - 27);
  });

  it("leaves ungrouped modules out of every total", () => {
    const totals = groupLocTotals(graph);
    const summed = [...totals.entries()]
      .filter(([id]) => id === "app" || id === "shared")
      .reduce((acc, [, loc]) => acc + loc, 0);
    // `src/main.ts` (10 LOC) has no group, so it belongs to no root total.
    const projectLoc = graph.modules.reduce((acc, m) => acc + m.metrics.loc, 0);
    expect(summed).toBe(projectLoc - 10);
  });
});

describe("formatLoc", () => {
  it("shows exact counts below a thousand", () => {
    expect(formatLoc(0)).toBe("0");
    expect(formatLoc(999)).toBe("999");
  });

  it("compacts thousands so the badge stays inside the box", () => {
    expect(formatLoc(1000)).toBe("1.0k");
    expect(formatLoc(12480)).toBe("12k");
  });
});

describe("projection carries line counts into node data", () => {
  it("stamps each module's own LOC and each group's tree total", async () => {
    const layout = await new ElkLayoutEngine().layout(graph);
    const { nodes } = projectGraph(graph, layout, {
      locTotals: groupLocTotals(graph),
    });
    const module = nodes.find((n) => n.id === "src/core/store.ts");
    const group = nodes.find((n) => n.id === "core");
    expect(module?.data.loc).toBe(27);
    expect(group?.data.loc).toBe(CORE_LOC);
  });
});

describe("projection leaves line counts off without totals", () => {
  it("stamps no LOC when the View menu toggle is off", async () => {
    const layout = await new ElkLayoutEngine().layout(graph);
    const { nodes } = projectGraph(graph, layout);
    expect(nodes.find((n) => n.id === "src/core/store.ts")?.data.loc).toBeUndefined();
    expect(nodes.find((n) => n.id === "core")?.data.loc).toBeUndefined();
  });
});

describe("canvas line counters", () => {
  it("hides the badges until Line counts is enabled", async () => {
    const store = await readyGraphStore();
    const { container } = renderGraphCanvas(store);
    await waitFor(() =>
      expect(container.querySelector(`[data-id="src/core/store.ts"]`)).toBeTruthy(),
    );
    expect(container.querySelectorAll("[data-loc-badge]")).toHaveLength(0);
  });

  it("renders a counter badge on module and group boxes once enabled", async () => {
    const store = await readyGraphStore();
    const { container, canvasUi } = renderGraphCanvas(store);
    act(/*enable line counts*/ () => canvasUi.setLineCountsVisible(/*visible=*/true));
    await waitFor(() => {
      const module = container.querySelector(`[data-id="src/core/store.ts"] [data-loc-badge]`);
      expect(module?.textContent).toBe("27");
    });
    const group = container.querySelector(`[data-id="core"] [data-loc-badge]`);
    expect(group?.textContent).toBe(String(CORE_LOC));
  });
});
