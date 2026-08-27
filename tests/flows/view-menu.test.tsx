import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readyGraphStore, renderGraphCanvas } from "../helpers/flow-graph-canvas";
import { createMockAnalysisClient } from "../../src/ipc/analysis-client";
import type { AnalysisClient } from "../../src/ipc/analysis-client";
import { createMockGitClient } from "../../src/ipc/git-client";
import { createMockProjectConfigClient, writeHidePlugins } from "../../src/ipc/project-config-client";
import { ElkLayoutEngine } from "../../src/domain/layout";
import { GraphSessionStore } from "../../src/state/graph-session";
import { CanvasUiState, ViewMenu } from "../../src/features/graph_canvas";

/** A ready store whose project looks like a git repository (heatmap available). */
async function readyGitGraphStore(
  analysis: AnalysisClient = createMockAnalysisClient(),
): Promise<GraphSessionStore> {
  const git = { ...createMockGitClient(), isGitRepo: async () => true };
  const store = new GraphSessionStore(analysis, git, new ElkLayoutEngine());
  await store.loadProject("/sample");
  return store;
}

/** Flow: toolbar View menu drives hide-tests, heatmap, and diff entry. */
describe("flow: view-menu", () => {
  function openViewMenu() {
    fireEvent.click(screen.getByRole("button", { name: "View" }));
  }

  it("toggling Hide tests updates the store and keeps the menu open", async () => {
    const store = await readyGraphStore();
    renderGraphCanvas(store);
    openViewMenu();

    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Hide tests" }));

    expect(store.getHideTests()).toBe(true);
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("hides Hide plugins on non-Unreal graphs", async () => {
    const store = await readyGraphStore();
    renderGraphCanvas(store);
    openViewMenu();
    expect(screen.queryByRole("menuitemcheckbox", { name: "Hide plugins" })).toBeNull();
  });

  it("shows Hide plugins checked for Unreal graphs and reports uncheck", async () => {
    const store = await readyGraphStore();
    const onChange = vi.fn();
    render(
      <ViewMenu
        store={store}
        ui={new CanvasUiState()}
        plugins={{ hidden: true, onChange }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "View" }));
    const item = screen.getByRole("menuitemcheckbox", { name: "Hide plugins" });
    expect(item).toHaveAttribute("aria-checked", "true");
    fireEvent.click(item);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("persisting Hide plugins writes config then reloads analysis", async () => {
    const client = createMockProjectConfigClient();
    const analysis = createMockAnalysisClient();
    const analyzeProject = vi.spyOn(analysis, "analyzeProject");
    const store = await readyGitGraphStore(analysis);
    await writeHidePlugins(client, "/sample", /*hide=*/ false);
    await store.loadProject("/sample");
    const saved = await client.readProjectConfig("/sample");
    expect(saved.unreal.hidePlugins).toBe(false);
    expect(analyzeProject).toHaveBeenLastCalledWith("/sample", {
      metricsWindowDays: 90,
      hideTopLevelDotDirs: true,
    });
  });

  it("Hide dot directories starts on and reloads the project when unchecked", async () => {
    const analysis = createMockAnalysisClient();
    const analyzeProject = vi.spyOn(analysis, "analyzeProject");
    const store = await readyGitGraphStore(analysis);
    renderGraphCanvas(store);
    openViewMenu();

    const item = screen.getByRole("menuitemcheckbox", { name: "Hide dot directories" });
    expect(item).toHaveAttribute("aria-checked", "true");
    expect(store.getHideDotDirectories()).toBe(true);

    fireEvent.click(item);

    await waitFor(() => expect(store.getHideDotDirectories()).toBe(false));
    expect(analyzeProject).toHaveBeenLastCalledWith("/sample", {
      metricsWindowDays: 90,
      hideTopLevelDotDirs: false,
    });
  });

  it("Line counts starts off and reveals the LOC badges when checked", async () => {
    const store = await readyGraphStore();
    const { container, canvasUi } = renderGraphCanvas(store);
    openViewMenu();

    const item = screen.getByRole("menuitemcheckbox", { name: "Line counts" });
    expect(item).toHaveAttribute("aria-checked", "false");

    fireEvent.click(item);

    expect(canvasUi.getLineCountsVisible()).toBe(true);
    expect(item).toHaveAttribute("aria-checked", "true");
    await waitFor(() =>
      expect(container.querySelectorAll("[data-loc-badge]").length).toBeGreaterThan(0),
    );
  });

  it("enables the Instability heatmap when the project is not a git repository", async () => {
    const store = await readyGraphStore();
    renderGraphCanvas(store);
    openViewMenu();

    const item = screen.getByRole("menuitemcheckbox", { name: "Heatmap" });
    expect(item).not.toBeDisabled();
    fireEvent.click(item);

    expect(store.getHeatmapEnabled()).toBe(true);
    expect(store.getHeatmapMode()).toBe("instability");
    expect(screen.getByRole("menuitemradio", { name: "Activity" })).toBeDisabled();
    expect(screen.getByRole("menuitemradio", { name: "Risk" })).toBeDisabled();
    expect(screen.getByRole("menuitemradio", { name: "Instability" }))
      .toHaveAttribute("aria-checked", "true");
    expect(screen.queryByRole("button", { name: "Last 90 days" })).toBeNull();
  });

  it("enabling the heatmap reveals mode radios and the canvas legend", async () => {
    const store = await readyGitGraphStore();
    renderGraphCanvas(store);
    openViewMenu();
    expect(screen.queryByRole("menuitemradio", { name: "Activity" })).toBeNull();

    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Heatmap" }));

    expect(store.getHeatmapEnabled()).toBe(true);
    expect(screen.getByRole("menuitemradio", { name: "Activity" }))
      .toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("menuitemradio", { name: "Instability" })).toBeInTheDocument();
    expect(screen.getByText("Last 90 days")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("menuitemradio", { name: "Risk" }));
    expect(store.getHeatmapMode()).toBe("risk");

    fireEvent.click(screen.getByRole("menuitemradio", { name: "Instability" }));
    expect(store.getHeatmapMode()).toBe("instability");
    expect(screen.queryByRole("button", { name: "Last 90 days" })).toBeNull();
  });

  it("changes the heatmap timeframe from the legend modal", async () => {
    const analysis = createMockAnalysisClient();
    const analyzeProject = vi.spyOn(analysis, "analyzeProject");
    const store = await readyGitGraphStore(analysis);
    store.setHeatmapEnabled(true);
    renderGraphCanvas(store);

    fireEvent.click(screen.getByRole("button", { name: "Last 90 days" }));
    expect(screen.getByRole("dialog", { name: "Activity timeframe" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("spinbutton", { name: "Number of days" }), {
      target: { value: "14" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Last 14 days" }))
      .toBeInTheDocument());
    expect(analyzeProject).toHaveBeenLastCalledWith("/sample", {
      metricsWindowDays: 14,
      hideTopLevelDotDirs: true,
    });
    expect(store.getMetricsWindowDays()).toBe(14);
  });

  it("hides Visualize diff… while a diff overlay is active", async () => {
    const store = await readyGraphStore();
    store.applyDiffFromPaste(
      [
        "diff --git a/src/core/store.ts b/src/core/store.ts",
        "--- a/src/core/store.ts",
        "+++ b/src/core/store.ts",
        "@@ -1,1 +1,2 @@",
        " context",
        "+added",
      ].join("\n"),
    );
    renderGraphCanvas(store);
    openViewMenu();

    expect(screen.queryByRole("menuitem", { name: "Visualize diff…" })).toBeNull();
  });

  it("Arrow visibility defaults to 'Show all' and switches options in submenu", async () => {
    const store = await readyGraphStore();
    const { canvasUi } = renderGraphCanvas(store);
    openViewMenu();

    const submenuTrigger = screen.getByRole("menuitem", { name: /Arrow visibility/ });
    expect(submenuTrigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.mouseEnter(submenuTrigger.parentElement!);
    expect(submenuTrigger).toHaveAttribute("aria-expanded", "true");

    const showAll = screen.getByRole("menuitemradio", { name: "Show all" });
    const hideHeads = screen.getByRole("menuitemradio", {
      name: "Hide arrow heads for non-selected modules",
    });
    const hideArrows = screen.getByRole("menuitemradio", {
      name: "Hide entire arrows for non-selected modules",
    });

    expect(showAll).toHaveAttribute("aria-checked", "true");
    expect(hideHeads).toHaveAttribute("aria-checked", "false");
    expect(hideArrows).toHaveAttribute("aria-checked", "false");
    expect(canvasUi.getArrowVisibility()).toBe("all");

    fireEvent.click(hideHeads);
    expect(canvasUi.getArrowVisibility()).toBe("hide-non-selected-heads");
    expect(hideHeads).toHaveAttribute("aria-checked", "true");
    expect(showAll).toHaveAttribute("aria-checked", "false");

    fireEvent.click(hideArrows);
    expect(canvasUi.getArrowVisibility()).toBe("hide-non-selected-arrows");
    expect(hideArrows).toHaveAttribute("aria-checked", "true");
    expect(hideHeads).toHaveAttribute("aria-checked", "false");
  });
});


