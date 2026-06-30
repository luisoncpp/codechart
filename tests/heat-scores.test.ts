import { describe, expect, it } from "vitest";
import goldenGraph from "./fixtures/golden/project-graph.json";
import {
  computeHeatProjection,
  heatBand,
  rawHeatValue,
  type ProjectGraph,
} from "../src/domain/graph";

const base = goldenGraph as unknown as ProjectGraph;

function graphWithMetrics(
  entries: Record<string, { churn?: number; bugRisk?: number; fixCommits?: number }>,
): ProjectGraph {
  return {
    ...base,
    modules: base.modules.map((m) => ({
      ...m,
      metrics: {
        ...m.metrics,
        churn: entries[m.id]?.churn,
        bugRisk: entries[m.id]?.bugRisk,
        fixCommits: entries[m.id]?.fixCommits,
      },
    })),
  };
}

describe("heat-scores", () => {
  it("scores inactive modules at zero (coldest hue)", () => {
    const graph = graphWithMetrics({
      "src/core/store.ts": { churn: 10 },
    });
    const ids = new Set(graph.modules.map((m) => m.id));
    const heat = computeHeatProjection(graph, "activity", ids);
    const inactive = heat.modules.get("src/core/todo.ts");
    expect(inactive?.score).toBe(0);
    expect(inactive?.visible).toBe(true);
  });

  it("ranks active modules by percentile", () => {
    const graph = graphWithMetrics({
      "src/core/store.ts": { churn: 10 },
      "src/core/todo.ts": { churn: 5 },
      "src/core/index.ts": { churn: 1 },
    });
    const ids = new Set(graph.modules.map((m) => m.id));
    const heat = computeHeatProjection(graph, "activity", ids);
    const hot = heat.modules.get("src/core/store.ts");
    const cold = heat.modules.get("src/core/index.ts");
    expect(hot?.visible).toBe(true);
    expect(hot!.score).toBeGreaterThan(cold!.score ?? 0);
  });

  it("remaps risk without recomputing raw metrics", () => {
    const graph = graphWithMetrics({
      "src/core/store.ts": { churn: 2, bugRisk: 8 },
      "src/core/todo.ts": { churn: 8, bugRisk: 2 },
    });
    const ids = new Set(["src/core/store.ts", "src/core/todo.ts"]);
    const activity = computeHeatProjection(graph, "activity", ids);
    const risk = computeHeatProjection(graph, "risk", ids);
    expect(activity.modules.get("src/core/todo.ts")!.score).toBeGreaterThan(
      activity.modules.get("src/core/store.ts")!.score,
    );
    expect(risk.modules.get("src/core/store.ts")!.score).toBeGreaterThan(
      risk.modules.get("src/core/todo.ts")!.score,
    );
  });

  it("assigns parent groups p90 from nested child modules", () => {
    const graph = graphWithMetrics({
      "src/core/store.ts": { churn: 10 },
      "src/ui/index.ts": { churn: 1 },
    });
    const ids = new Set(graph.modules.map((m) => m.id));
    const heat = computeHeatProjection(graph, "activity", ids);
    expect(heat.groups.get("core")!.score).toBeGreaterThan(0);
    expect(heat.groups.get("app")!.score).toBeGreaterThan(0);
  });

  it("assigns collapsed groups the p90 of child scores", () => {
    const graph = graphWithMetrics({
      "src/core/store.ts": { churn: 10 },
      "src/core/todo.ts": { churn: 2 },
      "src/core/index.ts": { churn: 1 },
    });
    const ids = new Set(graph.modules.map((m) => m.id));
    const heat = computeHeatProjection(graph, "activity", ids);
    const group = heat.groups.get("core");
    expect(group?.visible).toBe(true);
    expect(group!.score).toBeGreaterThan(0);
  });

  it("labels qualitative bands for inspector", () => {
    expect(heatBand(undefined)).toBe("—");
    expect(heatBand(0.05)).toBe("Low");
    expect(heatBand(0.5)).toBe("Moderate");
    expect(heatBand(0.9)).toBe("High");
  });

  it("reads raw values per mode", () => {
    const graph = graphWithMetrics({ "src/core/store.ts": { churn: 3, bugRisk: 5 } });
    const module = graph.modules.find((m) => m.id === "src/core/store.ts")!;
    expect(rawHeatValue(module, "activity")).toBe(3);
    expect(rawHeatValue(module, "risk")).toBe(5);
  });
});
