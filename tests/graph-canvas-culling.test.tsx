/// <reference types="@testing-library/jest-dom" />
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import goldenGraph from "./fixtures/golden/project-graph.json";
import type { ProjectGraph } from "../src/domain/graph";
import { readyGraphStore, renderGraphCanvas } from "./helpers/flow-graph-canvas";
import { clickSymbolOnCanvas } from "./helpers/click-symbol-on-canvas";

const graph = goldenGraph as unknown as ProjectGraph;

const recorded = vi.hoisted(() => ({ props: null as Record<string, unknown> | null }));

vi.mock("@xyflow/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@xyflow/react")>();
  const RecordingReactFlow: typeof actual.ReactFlow = (props) => {
    recorded.props = props as Record<string, unknown>;
    return <actual.ReactFlow {...props} />;
  };
  return { ...actual, ReactFlow: RecordingReactFlow };
});

describe("GraphCanvas viewport culling", () => {
  it("enables onlyRenderVisibleElements so off-screen nodes unmount (L1.5 pan perf)", async () => {
    const store = await readyGraphStore();
    renderGraphCanvas(store);
    await waitFor(() => expect(recorded.props).not.toBeNull());
    expect(recorded.props?.onlyRenderVisibleElements).toBe(true);
  });

  it("still mounts every group and module node under jsdom (unmeasured nodes force-render)", async () => {
    // Pins the behavior the whole jsdom suite relies on: the no-op
    // ResizeObserver stub means nodes are never measured, and React Flow
    // force-renders unmeasured nodes even with culling on. If a React Flow
    // upgrade changes that, this fails next to the flag test above.
    const store = await readyGraphStore();
    const { container } = renderGraphCanvas(store);
    await waitFor(() => {
      const nodes = container.querySelectorAll(".react-flow__node");
      expect(nodes).toHaveLength(graph.groups.length + graph.modules.length);
    });
  });

  it("keeps pinned previews open when the canvas reports an outside move", async () => {
    const store = await readyGraphStore();
    store.setZoomLevel(/*level=*/1.5);
    await clickSymbolOnCanvas(store, "src/core/store.ts::TodoStore");
    await waitFor(() =>
      expect(document.querySelector(".symbol-widget")).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Pin frame" }));

    const onMoveStart = recorded.props?.onMoveStart as (event: MouseEvent) => void;
    act(() => onMoveStart(new MouseEvent("pointerdown")));

    expect(document.querySelector(".symbol-widget")).toBeTruthy();
  });
});
