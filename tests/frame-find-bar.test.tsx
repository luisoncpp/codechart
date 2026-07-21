/// <reference types="@testing-library/jest-dom" />
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SymbolSourceWidget, type FrameHandlers } from "../src/features/graph_canvas/Private/preview_frames/SymbolSourceWidget";
import type { PreviewFrame } from "../src/features/graph_canvas/Private/preview_frames/frame-list";

const SOURCE = "const foo = 1;\nfunction bar() {\n  return foo + foo;\n}";

function makeFrame(overrides: Partial<PreviewFrame> = {}): PreviewFrame {
  return {
    id: 1,
    moduleId: "m1",
    moduleLabel: "mod.ts",
    symbolName: "bar",
    modulePath: "src/mod.ts",
    color: "#64748b",
    sourceText: SOURCE,
    top: 0,
    left: 0,
    zIndex: 0,
    ...overrides,
  };
}

function makeHandlers(): FrameHandlers {
  return { onClose: vi.fn(), onMove: vi.fn(), onActivate: vi.fn(), onNavigate: vi.fn() };
}

function renderWidget(frame: PreviewFrame, handlers = makeHandlers()) {
  const utils = render(
    <SymbolSourceWidget
      frame={frame}
      clickableSymbols={new Set(["foo"])}
      handlers={handlers}
    />,
  );
  const widget = utils.container.querySelector<HTMLDivElement>(".symbol-widget")!;
  return { ...utils, widget, handlers };
}

function openBarViaCtrlF(widget: HTMLDivElement) {
  widget.focus();
  fireEvent.keyDown(window, { key: "f", ctrlKey: true });
}

function typeQuery(container: HTMLElement, query: string): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>(".symbol-widget__find-input")!;
  fireEvent.change(input, { target: { value: query } });
  return input;
}

describe("find-in-frame", () => {
  it("opens the bar with Ctrl+F on the focused frame", () => {
    const { container, widget } = renderWidget(makeFrame());
    expect(container.querySelector(".symbol-widget__find")).toBeNull();
    openBarViaCtrlF(widget);
    expect(container.querySelector(".symbol-widget__find")).not.toBeNull();
  });

  it("does not claim Ctrl+Shift+F (project search shortcut)", () => {
    const { container, widget } = renderWidget(makeFrame());
    widget.focus();
    fireEvent.keyDown(window, { key: "f", ctrlKey: true, shiftKey: true });
    expect(container.querySelector(".symbol-widget__find")).toBeNull();
  });

  it("ignores Ctrl+F when the frame is neither focused nor hovered", () => {
    const { container } = renderWidget(makeFrame());
    fireEvent.keyDown(window, { key: "f", ctrlKey: true });
    expect(container.querySelector(".symbol-widget__find")).toBeNull();
  });

  it("opens the bar via the header toggle, which advertises the shortcut", () => {
    const { container } = renderWidget(makeFrame());
    const toggle = container.querySelector(".symbol-widget__find-toggle")!;
    expect(toggle).toHaveAttribute("title", expect.stringContaining("Ctrl+F"));
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(toggle);
    expect(container.querySelector(".symbol-widget__find")).not.toBeNull();
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });

  it("closes the bar when the header toggle is clicked again", () => {
    const { container, handlers } = renderWidget(makeFrame());
    const toggle = container.querySelector(".symbol-widget__find-toggle")!;
    fireEvent.click(toggle);
    typeQuery(container, "foo");
    fireEvent.click(toggle);
    expect(container.querySelector(".symbol-widget__find")).toBeNull();
    expect(handlers.onClose).not.toHaveBeenCalled();
  });

  it("highlights all matches with one active and shows the counter", () => {
    const { container, widget } = renderWidget(makeFrame());
    openBarViaCtrlF(widget);
    typeQuery(container, "foo");
    expect(container.querySelectorAll(".hl-match")).toHaveLength(3);
    expect(container.querySelectorAll(".hl-match--active")).toHaveLength(1);
    expect(container.querySelector(".symbol-widget__find-counter")).toHaveTextContent("1 of 3");
  });

  it("navigates with Enter and wraps backward with Shift+Enter", () => {
    const { container, widget } = renderWidget(makeFrame());
    openBarViaCtrlF(widget);
    const input = typeQuery(container, "foo");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(container.querySelector(".symbol-widget__find-counter")).toHaveTextContent("2 of 3");
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect(container.querySelector(".symbol-widget__find-counter")).toHaveTextContent("3 of 3");
  });

  it("keeps the full identifier text clickable when a match splits it", () => {
    const { container, widget } = renderWidget(makeFrame());
    openBarViaCtrlF(widget);
    typeQuery(container, "o");
    const clickable = container.querySelector(".hl-clickable");
    expect(clickable).toHaveTextContent("foo");
  });

  it("escalates Escape: closes the bar first, then the frame", () => {
    const { container, widget, handlers } = renderWidget(makeFrame());
    openBarViaCtrlF(widget);
    const input = typeQuery(container, "foo");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(container.querySelector(".symbol-widget__find")).toBeNull();
    expect(handlers.onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(widget, { key: "Escape" });
    expect(handlers.onClose).toHaveBeenCalledWith(1);
  });

  it("searches description and code in a document frame", () => {
    const frame = makeFrame({ symbolName: null, description: "Handles foo parsing" });
    const { container, widget } = renderWidget(frame);
    openBarViaCtrlF(widget);
    typeQuery(container, "foo");
    expect(container.querySelectorAll(".hl-match")).toHaveLength(4);
    expect(container.querySelector(".symbol-widget__find-counter")).toHaveTextContent("1 of 4");
    // description match is first in navigation order
    const active = container.querySelector(".hl-match--active")!;
    expect(active.closest(".symbol-widget__document")).not.toBeNull();
    expect(active.closest("pre")).toBeNull();
  });

  it("shows 'No results' for a query with no matches", () => {
    const { container, widget } = renderWidget(makeFrame());
    openBarViaCtrlF(widget);
    typeQuery(container, "zzz");
    expect(container.querySelector(".symbol-widget__find-counter")).toHaveTextContent("No results");
  });
});
