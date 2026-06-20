import { describe, expect, it } from "vitest";
import goldenGraph from "./fixtures/golden/project-graph.json";
import { ElkLayoutEngine } from "../src/domain/layout";
import type { LayoutBox, LayoutedGraph } from "../src/domain/layout";
import type { ProjectGraph } from "../src/domain/graph";

const graph = goldenGraph as ProjectGraph;

function contains(outer: LayoutBox, inner: LayoutBox): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

function overlaps(a: LayoutBox, b: LayoutBox): boolean {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}

function allBoxes(g: LayoutedGraph): LayoutBox[] {
  return [...g.groups, ...g.modules];
}

describe("ElkLayoutEngine (golden model)", () => {
  it("gives every node finite coordinates and positive size", async () => {
    const result = await new ElkLayoutEngine().layout(graph);

    expect(result.groups).toHaveLength(graph.groups.length);
    expect(result.modules).toHaveLength(graph.modules.length);
    for (const box of allBoxes(result)) {
      for (const v of [box.x, box.y, box.width, box.height]) {
        expect(Number.isFinite(v)).toBe(true);
      }
      expect(box.width).toBeGreaterThan(0);
      expect(box.height).toBeGreaterThan(0);
    }
  });

  it("nests every module box inside its group box", async () => {
    const result = await new ElkLayoutEngine().layout(graph);
    const groupById = new Map(result.groups.map((g) => [g.id, g]));

    for (const m of result.modules) {
      if (m.parentId === null) continue;
      const group = groupById.get(m.parentId);
      expect(group, `group ${m.parentId} for ${m.id}`).toBeDefined();
      expect(contains(group!, m), `module ${m.id} inside ${m.parentId}`).toBe(true);
    }
  });

  it("does not overlap sibling group boxes", async () => {
    const result = await new ElkLayoutEngine().layout(graph);
    const byParent = new Map<string | null, LayoutBox[]>();
    for (const g of result.groups) {
      const list = byParent.get(g.parentId) ?? [];
      list.push(g);
      byParent.set(g.parentId, list);
    }

    for (const siblings of byParent.values()) {
      for (let i = 0; i < siblings.length; i++) {
        for (let j = i + 1; j < siblings.length; j++) {
          expect(
            overlaps(siblings[i], siblings[j]),
            `${siblings[i].id} overlaps ${siblings[j].id}`,
          ).toBe(false);
        }
      }
    }
  });

  it("is deterministic across runs", async () => {
    const a = await new ElkLayoutEngine().layout(graph);
    const b = await new ElkLayoutEngine().layout(graph);
    expect(b).toEqual(a);
  });
});
