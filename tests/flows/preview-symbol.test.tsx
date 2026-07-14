/// <reference types="@testing-library/jest-dom" />
import { describe, expect, it } from "vitest";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { readyGraphStore, renderGraphCanvas } from "../helpers/flow-graph-canvas";
import { clickSymbolOnCanvas } from "../helpers/click-symbol-on-canvas";
import { ReviewNotesStore } from "../../src/state/review-notes";
import type { ReviewNote } from "../../src/ipc/review-notes-client";
import type { ProjectGraph } from "../../src/domain/graph";

const reviewNote: ReviewNote = {
  id: "review-store",
  path: "src/core/store.ts",
  startLine: 1,
  endLine: 1,
  anchorLines: ["// store"],
  body: "Review the store",
};

async function readyReviewNotes(graph: ProjectGraph) {
  const store = new ReviewNotesStore({
    loadReviewNotes: async () => ({ version: 1, notes: [reviewNote] }),
    saveReviewNotes: async () => undefined,
  });
  await store.loadProject({ root: "/sample", graph });
  return store;
}

describe("flow: preview-symbol", () => {
  it("opens the full L2 document from a module context menu at L1", async () => {
    const store = await readyGraphStore();
    const moduleId = "src/core/store.ts";
    const { container } = renderGraphCanvas(store);
    const moduleNode = await waitFor(() => {
      const node = container.querySelector(`[data-id="${moduleId}"]`);
      expect(node).toBeTruthy();
      return node!;
    });

    fireEvent.contextMenu(moduleNode);
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Open file preview" }),
    );

    const widget = await waitFor(() => {
      const frame = document.querySelector(".symbol-widget");
      expect(frame).toBeTruthy();
      return frame!;
    });
    expect(widget.querySelector(".symbol-widget__title")?.textContent).toBe("store.ts");
    expect(widget.textContent).toContain("Redux-like store managing state changes");
    expect(widget.textContent).toContain("Source Code");
  });

  it("clicking a symbol at L1.5 selects the parent module and opens the source widget", async () => {
    const store = await readyGraphStore();
    store.setZoomLevel(/*level=*/1.5);
    const moduleId = "src/core/store.ts";
    const symbolId = `${moduleId}::TodoStore`;
    await clickSymbolOnCanvas(store, symbolId);
    await waitFor(() => {
      expect(store.getSelectedId()).toBe(moduleId);
      expect(document.querySelector(".symbol-widget")).toBeTruthy();
    });
    const widget = document.querySelector(".symbol-widget")!;
    expect(widget.querySelector(".symbol-widget__title")?.textContent).toBe("TodoStore");
    expect(widget.querySelector(".symbol-widget__path")?.textContent).toBe(
      "src/core/store.ts",
    );
  });

  it("clicking a method name inside a frame opens a second frame on its definition", async () => {
    const store = await readyGraphStore();
    store.setZoomLevel(/*level=*/1.5);
    await clickSymbolOnCanvas(store, "src/core/store.ts::TodoStore");
    await waitFor(() =>
      expect(document.querySelector(".symbol-widget")).toBeTruthy(),
    );
    const methodToken = await waitFor(/*sourcePrefetchMakesMethodsClickable*/ () => {
      const token = [...document.querySelectorAll(".hl-clickable")].find(
        (el) => el.textContent === "toggle",
      );
      expect(token).toBeTruthy();
      return token!;
    });
    await act(async () => {
      fireEvent.click(methodToken);
    });
    await waitFor(() => {
      expect(document.querySelectorAll(".symbol-widget").length).toBe(2);
      const titles = [...document.querySelectorAll(".symbol-widget__title")].map(
        (el) => el.textContent,
      );
      expect(titles).toContain("toggle");
    });
  });

  it("clicking outside the symbol widget dismisses it", async () => {
    const store = await readyGraphStore();
    store.setZoomLevel(/*level=*/1.5);
    const symbolId = "src/core/store.ts::TodoStore";
    const { container } = await clickSymbolOnCanvas(store, symbolId);
    await waitFor(() =>
      expect(document.querySelector(".symbol-widget")).toBeTruthy(),
    );
    await act(async () => {
      fireEvent.click(container.querySelector(".react-flow__pane")!);
    });
    await waitFor(() =>
      expect(document.querySelector(".symbol-widget")).toBeNull(),
    );
  });

  it("does not reopen a completed Review Note preview after zooming out and in", async () => {
    const store = await readyGraphStore();
    const reviewNotes = await readyReviewNotes(store.getGraph()!);
    renderGraphCanvas(store, undefined, reviewNotes);

    act(() => {
      reviewNotes.navigate(reviewNote);
      reviewNotes.navigate(reviewNote);
    });
    await waitFor(() =>
      expect(document.querySelector(".symbol-widget")).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Close widget" }));
    act(() => reviewNotes.done(reviewNote.id));

    act(() => store.setZoomLevel(/*level=*/0));
    await act(async () => {
      store.setZoomLevel(/*level=*/1.5);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(document.querySelector(".symbol-widget")).toBeNull();
  });
});
