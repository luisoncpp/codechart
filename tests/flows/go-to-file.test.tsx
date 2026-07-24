import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { readyGraphStore, renderGraphCanvas } from "../helpers/flow-graph-canvas";

/**
 * Flow: go to file (Ctrl+P find bar). Searches module file names only —
 * never content. The fixture project contains src/core/store.ts and
 * src/core/todo.ts; "makeTodo" exists only in their content.
 */
describe("flow: go-to-file", () => {
  async function openGoToFile() {
    const store = await readyGraphStore();
    renderGraphCanvas(store);
    fireEvent.keyDown(window, { key: "p", ctrlKey: true });
    const input = screen.getByLabelText("Go to file") as HTMLInputElement;
    return { store, input };
  }

  async function searchFor(input: HTMLInputElement, query: string) {
    fireEvent.change(input, { target: { value: query } });
    const bar = screen.getByRole("search");
    await waitFor(() => expect(bar.textContent).toMatch(/\d+ of \d+|No results/));
    return bar;
  }

  it("Ctrl+P opens the go-to-file bar and Escape closes it", async () => {
    const { input } = await openGoToFile();
    expect(screen.getByRole("search")).toBeInTheDocument();

    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("search")).toBeNull();
  });

  it("opens from the toolbar Search menu", async () => {
    const store = await readyGraphStore();
    renderGraphCanvas(store);

    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Go to file/ }));

    expect(screen.getByLabelText("Go to file")).toBeInTheDocument();
  });

  it("matches file names case-insensitively", async () => {
    const { input } = await openGoToFile();

    const bar = await searchFor(input, "TODO");

    expect(bar.textContent).toContain("0 of 3"); // todo.ts, TodoItem.tsx, TodoList.tsx
  });

  it("does not match file content", async () => {
    const { input } = await openGoToFile();

    const bar = await searchFor(input, "makeTodo");

    expect(bar.textContent).toContain("No results");
  });

  it("Enter selects and centers the matched file", async () => {
    const { store, input } = await openGoToFile();
    const bar = await searchFor(input, "todo.ts");

    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(store.getSelectedId()).toBe("src/core/todo.ts"));
    expect(store.getFocusRequest()?.id).toBe("src/core/todo.ts");
    expect(bar.textContent).toContain("1 of 1");
  });

  it("switching to content search clears the file query", async () => {
    const { input } = await openGoToFile();
    await searchFor(input, "todo");

    fireEvent.keyDown(window, { key: "f", ctrlKey: true, shiftKey: true });

    const contentInput = screen.getByLabelText("Search in project") as HTMLInputElement;
    expect(contentInput.value).toBe("");
  });
});
