/// <reference types="@testing-library/jest-dom" />
import { ReactFlowProvider, type NodeProps } from "@xyflow/react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SymbolNodeData, SymbolRFNode } from "../src/domain/graph";
import { SymbolNodeView } from "../src/features/graph_canvas/Private/nodes/SymbolNodeView";
import "../src/features/graph_canvas/Private/graph-canvas.css";

const CASES = ["added", "removed", "modified"] as const;

describe("SymbolNodeView diff states", () => {
  it.each(CASES)("renders %s with its semantic class", (diffState) => {
    const data: SymbolNodeData = {
      label: "save",
      kind: "function",
      diffState,
    };
    const props = { data, selected: false } as NodeProps<SymbolRFNode>;
    const { container } = render(
      <ReactFlowProvider>
        <SymbolNodeView {...props} />
      </ReactFlowProvider>,
    );
    const box = container.querySelector(".symbol-box")!;

    expect(box).toHaveClass(`symbol-box--diff-${diffState}`);
    expect(box).toHaveAttribute("data-diff-state", diffState);
  });
});
