/// <reference types="@testing-library/jest-dom" />
import { describe, expect, it } from "vitest";
import { expandCollapsedAncestors } from "../src/state/graph-session/Private/ensure-node-visible";
import goldenGraph from "./fixtures/golden/project-graph.json";
import type { ProjectGraph } from "../../src/domain/graph";

const graph = goldenGraph as unknown as ProjectGraph;

describe("expandCollapsedAncestors", () => {
  it("expands collapsed ancestor groups for a nested module", () => {
    const collapsed = new Set(["app", "core"]);
    const moduleId = "src/core/store.ts";
    expect(expandCollapsedAncestors(graph, moduleId, collapsed)).toBe(true);
    expect(collapsed.has("app")).toBe(false);
    expect(collapsed.has("core")).toBe(false);
  });

  it("no-ops when the module is already visible", () => {
    const collapsed = new Set<string>();
    expect(expandCollapsedAncestors(graph, "src/core/store.ts", collapsed)).toBe(false);
  });
});
