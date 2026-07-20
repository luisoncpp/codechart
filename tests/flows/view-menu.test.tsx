import { describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { readyGraphStore, renderGraphCanvas } from "../helpers/flow-graph-canvas";
import { createMockAnalysisClient } from "../../src/ipc/analysis-client";
import { createMockGitClient } from "../../src/ipc/git-client";
import { ElkLayoutEngine } from "../../src/domain/layout";
import { GraphSessionStore } from "../../src/state/graph-session";

/** A ready store whose project looks like a git repository (heatmap available). */
async function readyGitGraphStore(): Promise<GraphSessionStore> {
  const git = { ...createMockGitClient(), isGitRepo: async () => true };
  const store = new GraphSessionStore(createMockAnalysisClient(), git, new ElkLayoutEngine());
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

  it("disables the Heatmap item when the project is not a git repository", async () => {
    const store = await readyGraphStore();
    renderGraphCanvas(store);
    openViewMenu();

    const item = screen.getByRole("menuitemcheckbox", { name: "Heatmap" });
    expect(item).toBeDisabled();
    expect(item).toHaveAttribute("title", "Requires a git repository");
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
    expect(screen.getByText("Last 90 days")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("menuitemradio", { name: "Risk" }));
    expect(store.getHeatmapMode()).toBe("risk");
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
});
