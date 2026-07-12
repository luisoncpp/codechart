import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import {
  collapsedDescription,
  collapsedLabelLayout,
  L0_LABEL_FONT,
} from "../src/features/graph_canvas/Private/collapsed-description";
import type { ProjectGraph } from "../src/domain/graph";
import { renderGraphCanvas } from "./helpers/flow-graph-canvas";
import { testGraphSessionStore } from "./helpers/test-graph-session-store";

/** The screenshot scene: a small collapsed card (expanded-footprint minimum,
 *  300×168) viewed at L0 (counter-scale 2.2), with a title that cannot fit at
 *  the base counter-scaled font. */
const SMALL_CARD = { width: 300, height: 168 };
const L0_SCALE = 2.2;

describe("L0 collapsed-card title fits its card (regression)", () => {
  it("shrinks a long title until one horizontal line fits a small card", () => {
    const data = { label: "Revisions rail", color: "#7c3aed" };
    const layout = collapsedLabelLayout(data, L0_SCALE, SMALL_CARD);
    // Base font (15 × 2.2 = 33 world px) cannot fit "Revisions" beside the
    // toggle chrome — the fit must shrink, not overflow.
    expect(layout.font).toBeLessThan(L0_LABEL_FONT * L0_SCALE);
    expect(layout.lines).toBe(1);
    expect(layout.height).toBeLessThanOrEqual(SMALL_CARD.height - 32);
  });

  it("keeps the base counter-scaled font when the title fits", () => {
    const data = { label: "Core", color: "#16a34a" };
    const layout = collapsedLabelLayout(data, L0_SCALE, SMALL_CARD);
    expect(layout.font).toBe(L0_LABEL_FONT * L0_SCALE);
    expect(layout.lines).toBe(1);
  });

  it("prefers a smaller horizontal title above a subgroup over a larger vertical one", () => {
    const nearSubgroup = collapsedLabelLayout(
      {
        label: "Language adapter",
        color: "#0891b2",
        minChildX: 260,
        minChildY: 70,
      },
      L0_SCALE,
      SMALL_CARD,
    );

    expect(nearSubgroup.width).toBe(SMALL_CARD.width - 32);
    expect(nearSubgroup.lines).toBe(1);
  });

  it("uses the top-left gap between a low-left and high-right subgroup", () => {
    const layout = collapsedLabelLayout(
      {
        label: "Tauri backend",
        color: "#ef4444",
        childObstacles: [
          { x: 0, y: 100, width: 180, height: 100 },
          { x: 200, y: 10, width: 300, height: 100 },
        ],
      },
      /*scale=*/1,
      { width: 500, height: 300 },
    );

    expect(layout.width).toBe(172);
    expect(layout.font).toBeGreaterThan(8);
  });

  it("shrinks the header chrome with the font, not the raw camera scale", () => {
    const data = { label: "Revisions rail", color: "#7c3aed" };
    const layout = collapsedLabelLayout(data, L0_SCALE, SMALL_CARD);
    // Chrome (toggle, gaps, icon) scales by font/base — a fixed 24 × scale
    // toggle would eat a small card before the text got any width.
    expect(layout.chromeScale).toBeCloseTo(layout.font / L0_LABEL_FONT);
  });

  it("keeps an unbreakable name horizontal at the floor font", () => {
    const data = { label: "SingleVeryLongUnbreakableGroupName", color: "#0ea5e9" };
    const layout = collapsedLabelLayout(data, /*scale=*/ 6.67, { width: 120, height: 90 });
    expect(layout.font).toBeGreaterThan(0);
    expect(layout.lines).toBe(1);
  });

  it("keeps the description clear of the fitted title", () => {
    const data = {
      label: "Revisions rail",
      color: "#7c3aed",
      descriptionShort: "short",
      // Positioned so a single-line 24 × scale header estimate would leave
      // exactly one description line — the real two-line title leaves none.
      minChildY: 90,
    };
    const desc = collapsedDescription(data, L0_SCALE, SMALL_CARD);
    expect(desc).toBeNull();
  });

  it("does not grow a description past its word-wrapped capacity", () => {
    const desc = collapsedDescription(
      {
        label: "Git client",
        color: "#d97706",
        descriptionShort: "IPC to git-backed analysis",
      },
      /*scale=*/1,
      { width: 197, height: 149 },
    );

    // Character-area math chooses 24px and two lines, but the browser wraps
    // this copy onto three lines at spaces/hyphens and clamps "analysis" away.
    expect(desc?.font).toBe(21);
    expect(desc?.lines).toBe(3);
  });

  it("does not clamp a complete wrapped description", () => {
    const desc = collapsedDescription(
      {
        label: "App",
        color: "#64748b",
        descriptionShort: "Root React component",
      },
      /*scale=*/1,
      { width: 160, height: 120 },
    );

    expect(desc?.text).toBe("Root React component");
    expect(desc?.truncate).toBe(false);
  });

  it("renders the collapsed card title at the fitted font, not the base 15px", async () => {
    const label = "PaneLocalRevisionListCoordination";
    const store = testGraphSessionStore({
      analyzeProject: async () => longTitledGroupGraph(label),
      readModuleSource: async () => "",
    });
    await store.loadProject("/x");
    store.setZoomLevel(0);
    renderGraphCanvas(store);
    const span = await waitFor(/*findCardTitle=*/ () => {
      const el = screen.getByTitle(label);
      expect(el).toBeTruthy();
      return el;
    });
    // The wrapping div carries the fitted fontSize; the base counter-scaled
    // font (15px at jsdom's zoom 1) cannot fit this title in its small card.
    const font = parseFloat(span.parentElement!.style.fontSize);
    expect(font).toBeLessThan(15);
    expect(span.style.whiteSpace).toBe("nowrap");
    expect(span.style.textOverflow).toBe("ellipsis");
  });
});

/** One small group whose title is far wider than its expanded footprint. */
function longTitledGroupGraph(label: string): ProjectGraph {
  return {
    root: "/x",
    groups: [{ id: "g", label, parentId: null, facadeModuleIds: [] }],
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
}
