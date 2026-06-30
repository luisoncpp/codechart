/// <reference types="@testing-library/jest-dom" />
import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { createMockShellClient } from "../../src/ipc/shell-client";
import type { ShellClient } from "../../src/ipc/shell-client";
import {
  flowGoldenGraph,
  readyGraphStore,
  renderGraphCanvas,
} from "../helpers/flow-graph-canvas";

describe("flow: reveal-in-explorer", () => {
  it("right-clicking a module opens reveal in file explorer", async () => {
    const revealInExplorer = vi.fn();
    const shell: ShellClient = { revealInExplorer };
    const store = await readyGraphStore();
    const { container } = renderGraphCanvas(store, shell);
    const module = flowGoldenGraph.modules.find((m) => m.path === "src/core/store.ts")!;
    await waitFor(() =>
      expect(container.querySelector(`[data-id="${module.id}"]`)).toBeTruthy(),
    );
    fireEvent.contextMenu(container.querySelector(`[data-id="${module.id}"]`)!);
    fireEvent.click(
      await screen.findByRole("menuitem", { name: /Reveal in file explorer/i }),
    );
    expect(revealInExplorer).toHaveBeenCalledWith("/sample/src/core/store.ts");
  });

  it("right-clicking a symbol reveals the parent module path", async () => {
    const revealInExplorer = vi.fn();
    const shell: ShellClient = { revealInExplorer };
    const store = await readyGraphStore();
    store.setZoomLevel(/*level=*/1.5);
    const { container } = renderGraphCanvas(store, shell);
    const symbolId = "src/core/store.ts::TodoStore";
    await waitFor(() =>
      expect(container.querySelector(`[data-id="${symbolId}"]`)).toBeTruthy(),
    );
    fireEvent.contextMenu(container.querySelector(`[data-id="${symbolId}"]`)!);
    fireEvent.click(
      await screen.findByRole("menuitem", { name: /Reveal in file explorer/i }),
    );
    expect(revealInExplorer).toHaveBeenCalledWith("/sample/src/core/store.ts");
  });

  it("right-clicking a group node does not open a context menu", async () => {
    const store = await readyGraphStore();
    const { container } = renderGraphCanvas(store, createMockShellClient());
    await waitFor(() =>
      expect(container.querySelector('[data-id="core"]')).toBeTruthy(),
    );
    fireEvent.contextMenu(container.querySelector('[data-id="core"]')!);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
