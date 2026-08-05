/// <reference types="@testing-library/jest-dom" />
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { readyGraphStore, renderGraphCanvas } from "./helpers/flow-graph-canvas";
import { clickSymbolOnCanvas } from "./helpers/click-symbol-on-canvas";

const recorded = vi.hoisted(() => ({ props: null as Record<string, unknown> | null }));

vi.mock("@xyflow/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@xyflow/react")>();
  const RecordingReactFlow: typeof actual.ReactFlow = (props) => {
    recorded.props = props as Record<string, unknown>;
    return <actual.ReactFlow {...props} />;
  };
  return { ...actual, ReactFlow: RecordingReactFlow };
});

describe("preview frame reopen while pinned", () => {
  it("keeps a reopened document preview through the menu-click canvas fall-through", async () => {
    const store = await readyGraphStore();
    store.setZoomLevel(/*level=*/1.5);
    const moduleId = "src/core/todo.ts";

    const { container } = await clickSymbolOnCanvas(store, "src/core/store.ts::TodoStore");
    await waitFor(() =>
      expect(document.querySelectorAll(".symbol-widget").length).toBe(1),
    );
    fireEvent.click(screen.getByRole("button", { name: "Pin frame" }));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const moduleNode = await waitFor(() => {
      const node = container.querySelector(`[data-id="${moduleId}"]`);
      expect(node).toBeTruthy();
      return node!;
    });

    const openTodoPreview = async () => {
      fireEvent.contextMenu(moduleNode);
      fireEvent.click(
        await screen.findByRole("menuitem", { name: "Open file preview" }),
      );
    };

    await openTodoPreview();
    await waitFor(() => {
      expect(document.querySelectorAll(".symbol-widget").length).toBe(2);
    });

    fireEvent.click(container.querySelector(".react-flow__pane")!);
    await waitFor(() => {
      expect(document.querySelectorAll(".symbol-widget").length).toBe(1);
    });

    // Reopen with cached source (microtask-fast), then simulate the canvas
    // move-start that follows when the menu unmounts under the click.
    await openTodoPreview();
    await act(async () => {
      await Promise.resolve();
      const onMoveStart = recorded.props?.onMoveStart as (event: MouseEvent) => void;
      onMoveStart(new MouseEvent("pointerdown"));
    });

    await waitFor(() => {
      expect(document.querySelectorAll(".symbol-widget").length).toBe(2);
    });
  });
});
