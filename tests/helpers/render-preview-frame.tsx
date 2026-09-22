import { render } from "@testing-library/react";
import { vi } from "vitest";
import {
  SymbolSourceWidget,
  type FrameHandlers,
} from "../../src/features/graph_canvas/Private/preview_frames/SymbolSourceWidget";
import type { PreviewFrame } from "../../src/features/graph_canvas/Private/preview_frames/frame-list";

/** Renders one preview frame; `overrides` replaces any frame field. */
export function renderPreviewFrame(overrides: Partial<PreviewFrame> = {}) {
  const frame: PreviewFrame = {
    id: 1,
    moduleId: "m1",
    moduleLabel: "mod.ts",
    symbolName: "bar",
    modulePath: "src/mod.ts",
    color: "#64748b",
    sourceText: "const foo = 1;\nfunction bar() {\n  return foo + foo;\n}",
    top: 0,
    left: 0,
    zIndex: 0,
    pinned: false,
    ...overrides,
  };
  const handlers: FrameHandlers = {
    onClose: vi.fn(),
    onMove: vi.fn(),
    onResize: vi.fn(),
    onActivate: vi.fn(),
    onTogglePin: vi.fn(),
    onNavigate: vi.fn(),
    onOpenWikiLink: vi.fn(),
  };
  const utils = render(
    <SymbolSourceWidget frame={frame} clickableSymbols={new Set()} handlers={handlers} />,
  );
  return {
    ...utils,
    widget: utils.container.querySelector<HTMLDivElement>(".symbol-widget")!,
    handlers,
  };
}
