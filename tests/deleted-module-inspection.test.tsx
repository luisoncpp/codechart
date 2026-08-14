/// <reference types="@testing-library/jest-dom" />
import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { renderInspectionPanel } from "./helpers/render-inspection-panel";
import { readyGraphStore } from "./helpers/flow-graph-canvas";
import type { GraphDiffOverlay } from "../src/domain/diff";

function buildSampleDiffOverlay(): GraphDiffOverlay {
  return {
    affectedModuleIds: new Set(["src/new-module.ts"]),
    deletedModuleIds: new Set(["src/deleted-module.ts", "src/renamed-module.ts"]),
    renamePairs: [{ from: "src/renamed-module.ts", to: "src/new-module.ts" }],
    addedSymbolIds: new Set(),
    removedSymbolIds: new Set(),
    modifiedSymbolIds: new Set(),
    addedEdgeIds: new Set(),
    addedEdges: [],
    removedEdges: [
      {
        id: "removed-edge-1",
        source: "src/deleted-module.ts",
        target: "src/target.ts",
        kind: "import",
        isViolation: false,
      },
    ],
    ghostModules: [
      {
        id: "src/deleted-module.ts",
        path: "src/deleted-module.ts",
        label: "deleted-module.ts",
        language: "typescript",
        groupId: null,
        isFacade: false,
        metrics: { loc: 42 },
        exportedSymbols: [],
      },
      {
        id: "src/renamed-module.ts",
        path: "src/renamed-module.ts",
        label: "renamed-module.ts",
        language: "typescript",
        groupId: null,
        isFacade: false,
        metrics: { loc: 80 },
        exportedSymbols: [],
      },
    ],
    beforeLayout: null,
    unifiedDiff: null,
    lineDiffByPath: new Map(),
    afterSourceByPath: new Map(),
  };
}

describe("deleted module inspection in diff mode", () => {
  it("renders a non-renamed deleted module with Deleted status and Renamed: No", async () => {
    const store = await readyGraphStore();
    const overlay = buildSampleDiffOverlay();
    // Simulate active diff overlay
    (store as unknown as { diffOverlay: GraphDiffOverlay }).diffOverlay = overlay;
    store.select("src/deleted-module.ts");

    renderInspectionPanel(store);

    expect(screen.getByRole("heading", { level: 2, name: "deleted-module.ts" })).toBeInTheDocument();
    expect(screen.getByText("src/deleted-module.ts")).toBeInTheDocument();
    expect(screen.getByText("Deleted")).toBeInTheDocument();
    expect(screen.getByText("Renamed").closest("div")).toHaveTextContent("RenamedNo");
  });

  it("renders a renamed deleted module with Renamed to button", async () => {
    const store = await readyGraphStore();
    const overlay = buildSampleDiffOverlay();
    (store as unknown as { diffOverlay: GraphDiffOverlay }).diffOverlay = overlay;
    store.select("src/renamed-module.ts");

    renderInspectionPanel(store);

    expect(screen.getByRole("heading", { level: 2, name: "renamed-module.ts" })).toBeInTheDocument();
    expect(screen.getByText("Deleted")).toBeInTheDocument();

    const link = screen.getByRole("button", { name: "src/new-module.ts" });
    expect(link).toBeInTheDocument();
  });

  it("clicking the Renamed to button focuses on the destination module", async () => {
    const store = await readyGraphStore();
    const overlay = buildSampleDiffOverlay();
    (store as unknown as { diffOverlay: GraphDiffOverlay }).diffOverlay = overlay;
    store.select("src/renamed-module.ts");

    const focusOn = vi.spyOn(store, "focusOn");
    renderInspectionPanel(store);

    const link = screen.getByRole("button", { name: "src/new-module.ts" });
    fireEvent.click(link);

    expect(focusOn).toHaveBeenCalledWith("src/new-module.ts");
  });

  it("renders removed import edges for deleted modules in the inspector", async () => {
    const store = await readyGraphStore();
    const overlay = buildSampleDiffOverlay();
    (store as unknown as { diffOverlay: GraphDiffOverlay }).diffOverlay = overlay;
    store.select("src/deleted-module.ts");

    renderInspectionPanel(store);

    const importsSection = screen.getByText(/^Imports/).closest("div")!;
    expect(within(importsSection).getByText("src/target.ts")).toBeInTheDocument();
  });

  it("renders Renamed from row when inspecting the destination module", async () => {
    const store = await readyGraphStore();
    const overlay = buildSampleDiffOverlay();
    (store as unknown as { diffOverlay: GraphDiffOverlay }).diffOverlay = overlay;

    // Use a known module id from golden graph or overlay target
    const existingMod = store.getGraph()!.modules[0];
    overlay.renamePairs = [{ from: "src/old-file.ts", to: existingMod.id }];

    store.select(existingMod.id);
    renderInspectionPanel(store);

    expect(screen.getByText("Renamed from")).toBeInTheDocument();
    expect(screen.getByText("src/old-file.ts")).toBeInTheDocument();
  });
});
