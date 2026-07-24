import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { readyGraphStore, renderGraphCanvas } from "../helpers/flow-graph-canvas";

/**
 * Flow: go to symbol. Exported names include locally declared symbols and
 * facade re-exports, so ITodoStore resolves to two different modules.
 */
describe("flow: go-to-symbol", () => {
  async function openGoToSymbol() {
    const store = await readyGraphStore();
    renderGraphCanvas(store);
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Go to symbol/ }));
    const input = screen.getByLabelText("Go to symbol") as HTMLInputElement;
    return { store, input };
  }

  async function searchFor(input: HTMLInputElement, query: string) {
    fireEvent.change(input, { target: { value: query } });
    const bar = screen.getByRole("search");
    await waitFor(() => expect(bar.textContent).toMatch(/\d+ of \d+|No results/));
    return bar;
  }

  it("opens from the Search menu", async () => {
    await openGoToSymbol();

    expect(screen.getByRole("search")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Go to symbol…")).toBeInTheDocument();
  });

  it("steps through symbols exported from different files", async () => {
    const { store, input } = await openGoToSymbol();
    const bar = await searchFor(input, "itodostore");

    expect(bar.textContent).toContain("0 of 2");

    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(store.getSelectedId()).toBe("src/services/index.ts"));
    expect(bar.textContent).toContain("1 of 2");

    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(store.getSelectedId()).toBe("src/services/types.ts"));
    expect(bar.textContent).toContain("2 of 2");
  });

  it("only searches exported names", async () => {
    const { input } = await openGoToSymbol();
    const bar = await searchFor(input, "toggle");

    expect(bar.textContent).toContain("No results");
  });

  it("Escape closes the bar", async () => {
    const { input } = await openGoToSymbol();

    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("search")).toBeNull();
  });
});
