/// <reference types="@testing-library/jest-dom" />
import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { readyGraphStore, renderGraphCanvas } from "../helpers/flow-graph-canvas";

const PASTED_DIFF = [
  "diff --git a/src/core/store.ts b/src/core/store.ts",
  "--- a/src/core/store.ts",
  "+++ b/src/core/store.ts",
  "@@ -1,2 +1,3 @@",
  " context",
  "-removed",
  "+added",
].join("\n");

describe("flow: visualize-diff", () => {
  it("clicking Visualize diff opens the diff modal", async () => {
    const store = await readyGraphStore();
    renderGraphCanvas(store);
    fireEvent.click(screen.getByRole("button", { name: "Visualize diff…" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Visualize diff")).toBeInTheDocument();
  });

  it("pasting a unified diff and clicking Visualize sets the diff overlay on the store", async () => {
    const store = await readyGraphStore();
    renderGraphCanvas(store);
    fireEvent.click(screen.getByRole("button", { name: "Visualize diff…" }));
    fireEvent.change(screen.getByPlaceholderText(/Paste a unified diff/i), {
      target: { value: PASTED_DIFF },
    });
    fireEvent.click(screen.getByRole("button", { name: "Visualize" }));
    await waitFor(() => {
      expect(store.getDiffOverlay()).not.toBeNull();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(store.getDiffOverlay()?.affectedModuleIds.has("src/core/store.ts")).toBe(true);
  });

  it("clicking Stop visualizing diff clears the overlay", async () => {
    const store = await readyGraphStore();
    store.applyDiffFromPaste(PASTED_DIFF);
    renderGraphCanvas(store);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Stop visualizing diff" })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Stop visualizing diff" }));
    expect(store.getDiffOverlay()).toBeNull();
    expect(screen.queryByRole("button", { name: "Stop visualizing diff" })).not.toBeInTheDocument();
  });
});
