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

const DELETED_DIFF = [
  "diff --git a/src/core/validate.ts b/src/core/validate.ts",
  "deleted file mode 100644",
  "--- a/src/core/validate.ts",
  "+++ /dev/null",
  "@@ -1,5 +0,0 @@",
  "-export function validate() {}",
].join("\n");

const RENAME_DIFF = [
  "diff --git a/src/core/gone.ts b/src/core/validate.ts",
  "similarity index 88%",
  "rename from src/core/gone.ts",
  "rename to src/core/validate.ts",
].join("\n");

const GHOST_DELETED_DIFF = [
  "diff --git a/src/core/gone.ts b/src/core/gone.ts",
  "deleted file mode 100644",
  "--- a/src/core/gone.ts",
  "+++ /dev/null",
  "@@ -1,3 +0,0 @@",
  "-export function gone() {",
  "-  return true;",
  "-}",
].join("\n");

describe("flow: visualize-diff", () => {
  it("clicking Visualize diff opens the diff modal", async () => {
    const store = await readyGraphStore();
    renderGraphCanvas(store);
    fireEvent.click(screen.getByRole("button", { name: "View" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Visualize diff…" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Visualize diff")).toBeInTheDocument();
  });

  it("pasting a unified diff and clicking Visualize sets the diff overlay on the store", async () => {
    const store = await readyGraphStore();
    renderGraphCanvas(store);
    fireEvent.click(screen.getByRole("button", { name: "View" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Visualize diff…" }));
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

  it("pasting a diff with a deleted file renders the deleted file with diffState deleted", async () => {
    const store = await readyGraphStore();
    await store.applyDiffFromPaste(DELETED_DIFF);
    expect(store.getDiffOverlay()?.deletedModuleIds.has("src/core/validate.ts")).toBe(true);
  });

  it("clicking Stop visualizing diff clears the overlay", async () => {
    const store = await readyGraphStore();
    await store.applyDiffFromPaste(PASTED_DIFF);
    renderGraphCanvas(store);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Stop visualizing diff" })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Stop visualizing diff" }));
    expect(store.getDiffOverlay()).toBeNull();
    expect(screen.queryByRole("button", { name: "Stop visualizing diff" })).not.toBeInTheDocument();
  });
});

describe("flow: visualize-diff rename", () => {
  it("pasting a git rename records a 1:1 pair from the deleted path to the created path", async () => {
    const store = await readyGraphStore();
    await store.applyDiffFromPaste(RENAME_DIFF);
    const overlay = store.getDiffOverlay();
    expect(overlay?.deletedModuleIds.has("src/core/gone.ts")).toBe(true);
    expect(overlay?.affectedModuleIds.has("src/core/validate.ts")).toBe(true);
    expect(overlay?.renamePairs).toEqual([
      { from: "src/core/gone.ts", to: "src/core/validate.ts" },
    ]);
  });
});

describe("flow: visualize-diff deleted file preview", () => {
  it("opens an all-red preview from a ghost card context menu", async () => {
    const store = await readyGraphStore();
    await store.applyDiffFromPaste(GHOST_DELETED_DIFF);
    expect(store.getDiffOverlay()?.beforeSourceByPath.get("src/core/gone.ts")).toContain(
      "export function gone()",
    );
    const { container } = renderGraphCanvas(store);
    const ghost = await waitFor(() => {
      const node = container.querySelector('[data-id="src/core/gone.ts"]');
      expect(node).toBeTruthy();
      return node!;
    });

    fireEvent.contextMenu(ghost);
    expect(screen.getByRole("menuitem", { name: "Open in editor" })).toBeDisabled();
    expect(screen.getByRole("menuitem", { name: "Reveal in file explorer" })).toBeDisabled();
    fireEvent.click(await screen.findByRole("menuitem", { name: "Open file preview" }));

    const widget = await waitFor(() => {
      const frame = document.querySelector(".symbol-widget");
      expect(frame).toBeTruthy();
      return frame!;
    });
    expect(widget.querySelectorAll(".symbol-widget__line--remove").length).toBe(3);
    expect(widget.querySelectorAll(".symbol-widget__line--add").length).toBe(0);
    expect(widget.querySelectorAll(".symbol-widget__line--context").length).toBe(0);
    expect(widget.textContent).toContain("export function gone()");
  });

  it("previews a deleted live-graph file as red rows, not the current disk body", async () => {
    const store = await readyGraphStore();
    await store.applyDiffFromPaste(DELETED_DIFF);
    const { container } = renderGraphCanvas(store);
    const card = await waitFor(() => {
      const node = container.querySelector('[data-id="src/core/validate.ts"]');
      expect(node).toBeTruthy();
      return node!;
    });

    fireEvent.contextMenu(card);
    fireEvent.click(await screen.findByRole("menuitem", { name: "Open file preview" }));

    const widget = await waitFor(() => {
      const frame = document.querySelector(".symbol-widget");
      expect(frame).toBeTruthy();
      return frame!;
    });
    expect(widget.querySelectorAll(".symbol-widget__line--remove").length).toBe(1);
    expect(widget.querySelectorAll(".symbol-widget__line--context").length).toBe(0);
    expect(widget.textContent).toContain("export function validate() {}");
  });
});
