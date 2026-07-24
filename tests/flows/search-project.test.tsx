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

  it("opens from the toolbar Search menu", async () => {
    const store = await readyGraphStore();
    renderGraphCanvas(store);

    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Search project/ }));

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

  it("opening a preview while searching seeds the frame find bar with the query", async () => {
    const { input } = await openFindBar();
    await searchFor(input, "makeTodo");
    fireEvent.keyDown(input, { key: "Enter" });
    const moduleNode = await waitFor(() => {
      const node = document.querySelector('[data-id="src/core/store.ts"]');
      expect(node).toBeTruthy();
      return node!;
    });

    fireEvent.contextMenu(moduleNode);
    fireEvent.click(await screen.findByRole("menuitem", { name: "Open file preview" }));

    const frameInput = await waitFor(() => {
      const el = document.querySelector(".symbol-widget__find input");
      expect(el).toBeTruthy();
      return el as HTMLInputElement;
    });
    expect(frameInput.value).toBe("makeTodo");
    await waitFor(() =>
      expect(document.querySelector(".symbol-widget .hl-match")).toBeTruthy(),
    );
  });

  it("opening a preview with the find bar closed leaves the frame find bar closed", async () => {
    const store = await readyGraphStore();
    renderGraphCanvas(store);
    const moduleNode = await waitFor(() => {
      const node = document.querySelector('[data-id="src/core/store.ts"]');
      expect(node).toBeTruthy();
      return node!;
    });

    fireEvent.contextMenu(moduleNode);
    fireEvent.click(await screen.findByRole("menuitem", { name: "Open file preview" }));

    await waitFor(() => expect(document.querySelector(".symbol-widget")).toBeTruthy());
    expect(document.querySelector(".symbol-widget__find")).toBeNull();
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
