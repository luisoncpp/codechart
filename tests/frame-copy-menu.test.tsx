/// <reference types="@testing-library/jest-dom" />
import { createEvent, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FrameContextMenu } from "../src/features/graph_canvas/Private/preview_frames/FrameContextMenu";
import type { FrameCopyMenuState } from "../src/features/graph_canvas/Private/preview_frames/use-frame-copy-menu";
import { renderPreviewFrame } from "./helpers/render-preview-frame";

function mockClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });
  return writeText;
}

afterEach(() => {
  window.getSelection()?.removeAllRanges();
});

describe("FrameContextMenu", () => {
  const menu: FrameCopyMenuState = {
    x: 12,
    y: 24,
    path: "src/mod.ts",
    snippet: "function bar() {",
    startLine: 2,
    endLine: 2,
  };

  it("copies the selection with a markdown fence including path and lines", async () => {
    const writeText = mockClipboard();
    const onClose = vi.fn();
    render(<FrameContextMenu menu={menu} onClose={onClose} />);
    fireEvent.click(screen.getByRole("menuitem", { name: "Copy with context" }));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith("```2:2:src/mod.ts\nfunction bar() {\n```"),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("keeps a plain Copy action that writes only the snippet", async () => {
    const writeText = mockClipboard();
    render(<FrameContextMenu menu={menu} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("menuitem", { name: "Copy" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("function bar() {"));
  });

  it("disables both actions when nothing is selected", () => {
    render(
      <FrameContextMenu
        menu={{ ...menu, snippet: "", startLine: null, endLine: null }}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole("menuitem", { name: "Copy" })).toBeDisabled();
    expect(screen.getByRole("menuitem", { name: "Copy with context" })).toBeDisabled();
  });

  it("disables Copy with context when the selection is not on source lines", () => {
    render(
      <FrameContextMenu
        menu={{ ...menu, startLine: null, endLine: null }}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole("menuitem", { name: "Copy" })).toBeEnabled();
    expect(screen.getByRole("menuitem", { name: "Copy with context" })).toBeDisabled();
  });
});

describe("preview frame copy menu", () => {
  it("replaces the native menu on the body and keeps Copy", () => {
    const { widget } = renderPreviewFrame();
    const body = widget.querySelector(".symbol-widget__body")!;
    const event = createEvent.contextMenu(body);
    fireEvent(body, event);
    expect(event.defaultPrevented).toBe(true);
    expect(screen.getByRole("menuitem", { name: "Copy" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Copy with context" })).toBeInTheDocument();
  });

  it("enables Copy with context for a selection on a numbered source row", () => {
    const { widget } = renderPreviewFrame();
    const line = widget.querySelector('[data-line="2"] .symbol-widget__text')!;
    selectNode(line);
    fireEvent.contextMenu(widget.querySelector(".symbol-widget__body")!);
    expect(screen.getByRole("menuitem", { name: "Copy with context" })).toBeEnabled();
  });
});

function selectNode(el: Element) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
}
