import { describe, expect, it } from "vitest";
import goldenGraph from "./fixtures/golden/project-graph.json";
import { ElkLayoutEngine } from "../src/domain/layout";
import type { LayoutBox, LayoutedGraph } from "../src/domain/layout";
import type { ProjectGraph } from "../src/domain/graph";
import { symbolBoxWidth, SYMBOL_BOX } from "../src/domain/layout/Private/symbol-box-metrics";
import {
  moduleBoxSize,
  MODULE_BOX,
  LABEL_FIT,
  fitLabelFontSize,
} from "../src/domain/layout/Private/module-box-metrics";

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
  return [...g.groups, ...g.modules, ...g.symbols];
}

describe("ElkLayoutEngine (golden model)", () => {
  it("gives every node finite coordinates and positive size", async () => {
    const result = await new ElkLayoutEngine().layout(graph);

    expect(result.groups).toHaveLength(graph.groups.length);
    expect(result.modules).toHaveLength(graph.modules.length);
    expect(result.symbols.length).toBeGreaterThan(0);
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

  it("nests every symbol box inside its module box", async () => {
    const result = await new ElkLayoutEngine().layout(graph);
    const moduleById = new Map(result.modules.map((m) => [m.id, m]));

    for (const s of result.symbols) {
      expect(s.parentId).toBeTruthy();
      const module = moduleById.get(s.parentId!);
      expect(module, `module ${s.parentId} for ${s.id}`).toBeDefined();
      expect(contains(module!, s), `symbol ${s.id} inside ${s.parentId}`).toBe(true);
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

  it("keeps every module box within the 4:5–4:3 aspect window", async () => {
    const result = await new ElkLayoutEngine().layout(graph);
    for (const m of result.modules) {
      const ar = m.width / m.height;
      expect(ar, `${m.id} too wide (${ar.toFixed(2)})`).toBeLessThanOrEqual(4 / 3 + 0.02);
      expect(ar, `${m.id} too tall (${ar.toFixed(2)})`).toBeGreaterThanOrEqual(4 / 5 - 0.02);
    }
  });

  it("packs top-level groups compactly rather than sprawling horizontally", async () => {
    const result = await new ElkLayoutEngine().layout(graph);
    // rectpacking at the root targets a screen-like aspect ratio; guard against
    // regressing to the old single layered row (which was ~4.7:1 wide).
    expect(result.width / result.height).toBeLessThan(2.5);
  });

  it("is deterministic across runs", async () => {
    const a = await new ElkLayoutEngine().layout(graph);
    const b = await new ElkLayoutEngine().layout(graph);
    expect(b).toEqual(a);
  });
});

describe("moduleBoxSize", () => {
  const EPS = 0.001;
  const inWindow = (box: { width: number; height: number }) => {
    const ar = box.width / box.height;
    expect(ar).toBeLessThanOrEqual(MODULE_BOX.maxAspect + EPS); // not wider than 4:3
    expect(ar).toBeGreaterThanOrEqual(MODULE_BOX.minAspect - EPS); // not taller than 4:5
  };

  it("keeps short filenames at the base footprint (the 4:3 edge)", () => {
    const box = moduleBoxSize("App.tsx");
    expect(box).toEqual({ width: MODULE_BOX.minWidth, height: MODULE_BOX.minHeight });
  });

  it("never shrinks below the base footprint", () => {
    const box = moduleBoxSize("a.ts");
    expect(box.width).toBeGreaterThanOrEqual(MODULE_BOX.minWidth);
    expect(box.height).toBeGreaterThanOrEqual(MODULE_BOX.minHeight);
  });

  it("stays in the aspect window for a very long filename", () => {
    const long =
      "a-really-extremely-long-module-filename-that-keeps-going-and-going-and-going-some-more.tsx";
    const box = moduleBoxSize(long);
    expect(box.height).toBeGreaterThan(MODULE_BOX.minHeight); // wrapped onto more lines
    inWindow(box);
  });

  it("stays in the aspect window for many exported symbols", () => {
    const symbols = Array.from({ length: 12 }, (_, i) => `exportedSymbolNumber${i}`);
    const box = moduleBoxSize("widget.ts", symbols);
    expect(box.width).toBeGreaterThan(MODULE_BOX.minWidth); // grew to hold the grid
    inWindow(box);
  });

  it("grows wider (not just taller) when content would be too tall", () => {
    const tall = moduleBoxSize("a.ts", Array.from({ length: 8 }, (_, i) => `s${i}`));
    inWindow(tall);
    expect(tall.height).toBeGreaterThan(MODULE_BOX.minHeight);
  });

  it("stays compact for a symbol-heavy module (area-based, not worst-case grid)", () => {
    // Mirrors a real `ipc.ts`: ~80 long export names. A naive sqrt(N)×maxWidth
    // grid would balloon past 1800px wide; area packing keeps it modest.
    const symbols = Array.from({ length: 80 }, (_, i) => `createRelationshipsDocumentRequestSchema${i}`);
    const box = moduleBoxSize("ipc.ts", symbols);
    inWindow(box);
    expect(box.width).toBeLessThan(900);
  });
});

describe("fitLabelFontSize", () => {
  it("grows a short filename well past the 11px floor in a base box", () => {
    const font = fitLabelFontSize("index.ts", MODULE_BOX.minWidth, MODULE_BOX.minHeight);
    expect(font).toBeGreaterThan(MODULE_BOX.fontSize);
    expect(font).toBeLessThanOrEqual(LABEL_FIT.maxFont);
  });

  it("never exceeds the cap", () => {
    expect(fitLabelFontSize("a", 800, 600)).toBe(LABEL_FIT.maxFont);
  });

  it("still fills a base box with a longer name (wrapping onto more lines)", () => {
    const long = "tauri-analysis-client.ts";
    const font = fitLabelFontSize(long, MODULE_BOX.minWidth, MODULE_BOX.minHeight);
    expect(font).toBeGreaterThan(MODULE_BOX.fontSize);
    expect(font).toBeLessThanOrEqual(LABEL_FIT.maxFont);
  });

  it("never returns below the base floor", () => {
    expect(fitLabelFontSize("averyverylongunbreakablefilename.tsx", 30, 20)).toBe(
      MODULE_BOX.fontSize,
    );
  });
});

describe("symbolBoxWidth", () => {
  it("keeps short names at the minimum footprint", () => {
    expect(symbolBoxWidth("getJson")).toBe(SYMBOL_BOX.minWidth);
  });

  it("grows for long camelCase export names", () => {
    expect(symbolBoxWidth("exportStagingController")).toBeGreaterThan(SYMBOL_BOX.minWidth);
    expect(symbolBoxWidth("exportStagingController")).toBeLessThanOrEqual(SYMBOL_BOX.maxWidth);
  });

  it("caps extremely long names", () => {
    const long = "resolveStagingBasketKeysByProjectIdentifier";
    expect(symbolBoxWidth(long)).toBe(SYMBOL_BOX.maxWidth);
  });
});
