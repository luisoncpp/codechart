/// <reference types="@testing-library/jest-dom" />
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { createMockShellClient } from "../../src/ipc/shell-client";
import type { ShellClient } from "../../src/ipc/shell-client";
import {
  flowGoldenGraph,
  readyGraphStore,
  renderGraphCanvas,
} from "../helpers/flow-graph-canvas";
import { zoomCanvasUntilSymbolVisible } from "../helpers/zoom-canvas-for-symbols";

describe("flow: reveal-in-explorer", () => {
  it("copies a module path relative to the project root", async () => {
    const writeText = vi.fn();
    Object.assign(navigator, { clipboard: { writeText } });
    const store = await readyGraphStore();
    const { container } = renderGraphCanvas(store, createMockShellClient());
    const module = flowGoldenGraph.modules.find((m) => m.path === "src/core/store.ts")!;
    await waitFor(() =>
      expect(container.querySelector(`[data-id="${module.id}"]`)).toBeTruthy(),
    );
    fireEvent.contextMenu(container.querySelector(`[data-id="${module.id}"]`)!);
    fireEvent.click(
      await screen.findByRole("menuitem", { name: /Copy relative path/i }),
    );
    expect(writeText).toHaveBeenCalledWith("src/core/store.ts");
  });

  it("right-clicking a module opens reveal in file explorer", async () => {
    const revealInExplorer = vi.fn();
    const shell: ShellClient = {
      ...createMockShellClient(),
      revealInExplorer,
    };
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

  it("opens a module in the configured editor", async () => {
    const openInEditor = vi.fn();
    const shell = { revealInExplorer: vi.fn(), openInEditor };
    const store = await readyGraphStore();
    const { container } = renderGraphCanvas(
      store,
      shell,
      undefined,
      "code-insiders",
    );
    const module = flowGoldenGraph.modules.find((m) => m.path === "src/core/store.ts")!;
    await waitFor(() =>
      expect(container.querySelector(`[data-id="${module.id}"]`)).toBeTruthy(),
    );
    fireEvent.contextMenu(container.querySelector(`[data-id="${module.id}"]`)!);
    const openItem = await screen.findByRole("menuitem", { name: /Open in editor/i });
    await act(async () => {
      fireEvent.click(openItem);
    });
    expect(openInEditor).toHaveBeenCalledWith(
      "/sample/src/core/store.ts",
      "code-insiders",
    );
  });

  it("reports an editor launch failure without closing the menu", async () => {
    const openInEditor = vi.fn().mockRejectedValue(new Error("Editor not found"));
    const shell = { revealInExplorer: vi.fn(), openInEditor };
    const store = await readyGraphStore();
    const { container } = renderGraphCanvas(store, shell);
    const module = flowGoldenGraph.modules.find((m) => m.path === "src/core/store.ts")!;
    await waitFor(() =>
      expect(container.querySelector(`[data-id="${module.id}"]`)).toBeTruthy(),
    );
    fireEvent.contextMenu(container.querySelector(`[data-id="${module.id}"]`)!);
    const openItem = await screen.findByRole("menuitem", { name: /Open in editor/i });
    await act(async () => {
      fireEvent.click(openItem);
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("Editor not found");
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("right-clicking a symbol reveals the parent module path", async () => {
    const revealInExplorer = vi.fn();
    const shell: ShellClient = {
      ...createMockShellClient(),
      revealInExplorer,
    };
    const store = await readyGraphStore();
    store.setZoomLevel(/*level=*/1.5);
    const { container } = renderGraphCanvas(store, shell);
    const symbolId = "src/core/store.ts::TodoStore";
    await waitFor(() =>
      expect(container.querySelector(`[data-id="src/core/store.ts"]`)).toBeTruthy(),
    );
    await zoomCanvasUntilSymbolVisible(container, symbolId);
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
