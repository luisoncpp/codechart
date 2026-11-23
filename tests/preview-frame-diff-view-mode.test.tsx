/// <reference types="@testing-library/jest-dom" />
import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { computeLineDiff } from "../src/domain/diff";
import { diffViewModePreference } from "../src/features/graph_canvas/Private/preview_frames/diff-view-mode-preference";
import { renderPreviewFrame } from "./helpers/render-preview-frame";

const BEFORE = ["keep1", "old2", "keep3", "gone4", "keep5"].join("\n");
const AFTER = ["keep1", "new2", "keep3", "keep5", "added5"].join("\n");

function renderDiffFrame(withDiff = true) {
  const fileDiff = withDiff ? computeLineDiff(BEFORE, AFTER) : undefined;
  return renderPreviewFrame({ symbolName: null, sourceText: AFTER }, fileDiff);
}

const kinds = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>(".symbol-widget__line")).map((r) => r.dataset.kind);

describe("Preview frame diff view mode", () => {
  afterEach(() => diffViewModePreference.set("unified"));

  it("hides the toggle for a file without diff rows, even after Split was chosen", () => {
    diffViewModePreference.set("split");
    const { container } = renderDiffFrame(/*withDiff=*/ false);
    expect(screen.queryByRole("button", { name: /Split diff view/ })).not.toBeInTheDocument();
    expect(container.querySelector(".symbol-widget__split-row")).toBeNull();
  });

  it("starts in unified mode with removed rows interleaved", () => {
    const { container } = renderDiffFrame();
    expect(screen.getByRole("button", { name: "Unified diff view" })).toHaveAttribute("aria-pressed", "true");
    expect(kinds(container)).toContain("remove");
    expect(container.querySelector(".symbol-widget__split-row")).toBeNull();
  });

  it("after-only mode hides every removed row but keeps the additions", () => {
    const { container } = renderDiffFrame();
    fireEvent.click(screen.getByRole("button", { name: /After-only view/ }));
    expect(kinds(container)).not.toContain("remove");
    expect(kinds(container)).toContain("add");
    expect(container.textContent).not.toContain("gone4");
  });

  it("split mode renders before | after columns with read-only before line numbers", () => {
    const { container } = renderDiffFrame();
    fireEvent.click(screen.getByRole("button", { name: /Split diff view/ }));
    const splitRows = container.querySelectorAll(".symbol-widget__split-row");
    expect(splitRows.length).toBeGreaterThan(0);
    const before = container.querySelector(".symbol-widget__split-cell--before")!;
    expect(before.querySelector("button.symbol-widget__ln")).toBeNull();
    expect(before.querySelector(".symbol-widget__ln")?.textContent).toBe("1");
    expect(container.querySelector(".symbol-widget__split-filler")).not.toBeNull();
    const replaced = Array.from(splitRows).find((row) => row.textContent?.includes("old2"))!;
    expect(replaced.textContent).toContain("new2");
  });

  it("new frames start in the last chosen mode", () => {
    const first = renderDiffFrame();
    fireEvent.click(screen.getByRole("button", { name: /Split diff view/ }));
    first.unmount();
    const { container } = renderDiffFrame();
    expect(screen.getByRole("button", { name: /Split diff view/ })).toHaveAttribute("aria-pressed", "true");
    expect(container.querySelector(".symbol-widget__split-row")).not.toBeNull();
  });
});
