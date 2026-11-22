import { describe, expect, it, vi } from "vitest";
import { PlaytestBridge } from "../src/app/Private/playtest-bridge";
import { CanvasUiState } from "../src/features/graph_canvas";
import { createMockDevtoolsClient } from "../src/ipc/devtools-client";
import { testGraphSessionStore } from "./helpers/test-graph-session-store";

describe("PlaytestBridge", () => {
  function setupBridge() {
    const store = testGraphSessionStore();
    const ui = new CanvasUiState();
    const onResize = vi.fn();
    const devtools = createMockDevtoolsClient(/*onToggle=*/ undefined, onResize);
    const bridge = new PlaytestBridge({
      store,
      ui,
      devtools,
      inspector: { open: true, width: 280, activeTab: "inspector" },
    });
    const viewportState = { x: 10, y: 20, zoom: 0.7 };
    const fitView = vi.fn(async () => true);
    const setViewport = vi.fn(async (next: { x: number; y: number; zoom: number }) => {
      viewportState.x = next.x;
      viewportState.y = next.y;
      viewportState.zoom = next.zoom;
      return true;
    });
    bridge.setViewportHandle({
      getViewport: () => ({ ...viewportState }),
      setViewport,
      fitView,
    });
    return { store, ui, onResize, bridge, viewportState, setViewport, fitView };
  }

  it("loads a project and reports full state snapshot", async () => {
    const { bridge } = setupBridge();
    const state = await bridge.loadProject("/fixture");
    expect(state.phase).toBe("ready");
    expect(state.projectRoot).toBe("/fixture");
    expect(state.counts.modules).toBeGreaterThan(0);
    expect(state.counts.groups).toBeGreaterThan(0);
    expect(state.inspector).toEqual({ open: true, width: 280, activeTab: "inspector" });
  });

  it("maps semantic zoom levels to canonical viewport zoom factors", async () => {
    const { bridge, store, viewportState } = setupBridge();
    await bridge.loadProject("/fixture");

    await bridge.setZoomLevel(0);
    expect(store.getZoomLevel()).toBe(0);
    expect(viewportState.zoom).toBe(0.3);

    await bridge.setZoomLevel(2);
    expect(store.getZoomLevel()).toBe(2);
    expect(viewportState.zoom).toBe(4.0);
  });

  it("delegates focus, viewport, diff paste/clear, node listing, and window resize", async () => {
    const { bridge, store, fitView, setViewport, onResize } = setupBridge();
    await bridge.loadProject("/fixture");
    const moduleId = store.getGraph()!.modules[0].id;

    const focused = await bridge.focusModule(moduleId);
    expect(focused.selectedId).toBe(moduleId);

    expect(await bridge.setViewport({ x: 50, y: 60 })).toBe(true);
    expect(setViewport).toHaveBeenCalledWith({ x: 50, y: 60, zoom: 0.7 }, { duration: 0 });

    expect(await bridge.fitView()).toBe(true);
    expect(fitView).toHaveBeenCalledTimes(1);

    bridge.updateInspector({ open: false, width: 320, activeTab: "review-notes" });
    expect(bridge.getState().inspector).toEqual({
      open: false,
      width: 320,
      activeTab: "review-notes",
    });

    expect(bridge.listNodes()).toEqual([]);

    const diffed = await bridge.applyDiffFromPaste("");
    expect(diffed.diffActive).toBe(true);

    await bridge.resizeWindow(1280, 720);
    expect(onResize).toHaveBeenCalledWith(1280, 720);

    const cleared = bridge.clearDiffOverlay();
    expect(cleared.diffActive).toBe(false);
  });

  it("rejects waitForReady when loadProject fails", async () => {
    const store = testGraphSessionStore({
      analyzeProject: async () => {
        throw new Error("bad repo");
      },
      readModuleSource: async () => "",
      searchModuleSources: async () => ({ matches: [], truncated: false }),
    });
    const bridge = new PlaytestBridge({
      store,
      ui: new CanvasUiState(),
      devtools: createMockDevtoolsClient(),
      inspector: { open: true, width: 280, activeTab: "inspector" },
    });
    await expect(bridge.loadProject("/missing")).rejects.toThrow("bad repo");
  });
});
