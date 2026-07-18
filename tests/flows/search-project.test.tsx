import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { readyGraphStore, renderGraphCanvas } from "../helpers/flow-graph-canvas";

/**
 * Flow: project-wide full-text search (Ctrl+F find bar).
 * The fixture project contains "makeTodo" on src/core/store.ts lines 2 and 11
 * and src/core/todo.ts line 8 — two matching files, store.ts first in module order.
 */
describe("flow: search-project", () => {
  async function openFindBar() {
    const store = await readyGraphStore();
    renderGraphCanvas(store);
    fireEvent.keyDown(window, { key: "f", ctrlKey: true, shiftKey: true });
    const input = screen.getByLabelText("Search in project") as HTMLInputElement;
    return { store, input };
  }

  async function searchFor(input: HTMLInputElement, query: string) {
    fireEvent.change(input, { target: { value: query } });
    const bar = screen.getByRole("search");
    await waitFor(() => expect(bar.textContent).toMatch(/\d+ of \d+|No results/));
    return bar;
  }

  it("Ctrl+Shift+F opens the find bar and Escape closes it", async () => {
    const { input } = await openFindBar();
    expect(screen.getByRole("search")).toBeInTheDocument();

    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("search")).toBeNull();
  });

  it("leaves Ctrl+F available to the browser", async () => {
    const store = await readyGraphStore();
    renderGraphCanvas(store);

    fireEvent.keyDown(window, { key: "f", ctrlKey: true });

    expect(screen.queryByRole("search")).toBeNull();
  });

  it("opens from the toolbar button", async () => {
    const store = await readyGraphStore();
    renderGraphCanvas(store);

    fireEvent.click(screen.getByRole("button", { name: "Search project" }));

    expect(screen.getByRole("search")).toBeInTheDocument();
  });

  it("typing a query shows the match counter before navigating", async () => {
    const { input } = await openFindBar();

    const bar = await searchFor(input, "makeTodo");

    expect(bar.textContent).toContain("0 of 2");
  });

  it("a query with no hits reads No results", async () => {
    const { input } = await openFindBar();

    const bar = await searchFor(input, "zzz-not-in-fixture");

    expect(bar.textContent).toContain("No results");
  });

  it("Enter selects and centers the first match without opening a preview", async () => {
    const { store, input } = await openFindBar();
    const bar = await searchFor(input, "makeTodo");

    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(store.getSelectedId()).toBe("src/core/store.ts"));
    expect(store.getFocusRequest()?.id).toBe("src/core/store.ts");
    expect(document.querySelector(".symbol-widget")).toBeNull();
    expect(bar.textContent).toContain("1 of 2");
  });

  it("Shift+Enter wraps backward to the last match", async () => {
    const { store, input } = await openFindBar();
    const bar = await searchFor(input, "makeTodo");
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(bar.textContent).toContain("1 of 2"));

    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });

    await waitFor(() => expect(bar.textContent).toContain("2 of 2"));
    await waitFor(() => expect(store.getSelectedId()).toBe("src/core/todo.ts"));
  });

  it("clicking Next in the bar does not open a preview", async () => {
    const { input } = await openFindBar();
    const bar = await searchFor(input, "makeTodo");
    fireEvent.keyDown(input, { key: "Enter" });

    fireEvent.click(screen.getByRole("button", { name: "Next match" }));

    await waitFor(() => expect(bar.textContent).toContain("2 of 2"));
    expect(document.querySelector(".symbol-widget")).toBeNull();
  });
});
