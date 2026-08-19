/// <reference types="@testing-library/jest-dom" />
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ModuleNodeData, ModuleSymbolDescriptor } from "../src/domain/graph";
import { SymbolNodeView } from "../src/features/graph_canvas/Private/nodes/SymbolNodeView";
import "../src/features/graph_canvas/Private/graph-canvas.css";

const CASES = ["added", "removed", "modified"] as const;

describe("SymbolNodeView diff states", () => {
  it.each(CASES)("renders %s with its semantic class", (diffState) => {
    const symbol: ModuleSymbolDescriptor = {
      id: "m.ts::save",
      label: "save",
      kind: "function",
      x: 0,
      y: 0,
      width: 40,
      height: 16,
      diffState,
    };
    const moduleData: ModuleNodeData = {
      label: "m.ts",
      isFacade: false,
      language: "typescript",
    };
    const { container } = render(
      <SymbolNodeView symbol={symbol} moduleData={moduleData} color="#64748b" />,
    );
    const box = container.querySelector(".symbol-box")!;

    expect(box).toHaveClass(`symbol-box--diff-${diffState}`);
    expect(box).toHaveAttribute("data-diff-state", diffState);
    expect(box).toHaveAttribute("data-symbol-id", "m.ts::save");
  });
});
