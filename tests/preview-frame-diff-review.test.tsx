/// <reference types="@testing-library/jest-dom" />
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PreviewFramesView } from "../src/features/graph_canvas/Private/preview_frames/PreviewFramesView";
import type { PreviewFrame } from "../src/features/graph_canvas/Private/preview_frames/frame-list";
import {
  attachLineDiff,
  pathsFromUnifiedDiff,
  type GraphDiffOverlay,
} from "../src/domain/diff";

const emptySets = {
  addedSymbolIds: new Set<string>(),
  removedSymbolIds: new Set<string>(),
  modifiedSymbolIds: new Set<string>(),
  addedEdgeIds: new Set<string>(),
  addedEdges: [] as GraphDiffOverlay["addedEdges"],
  removedEdges: [] as GraphDiffOverlay["removedEdges"],
  ghostModules: [] as GraphDiffOverlay["ghostModules"],
  beforeSourceByPath: new Map<string, string>(),
};

const DIFF_TEXT = [
  "diff --git a/src/core/store.ts b/src/core/store.ts",
  "--- a/src/core/store.ts",
  "+++ b/src/core/store.ts",
  "@@ -1,2 +1,3 @@",
  " context",
  "-removed",
  "+added",
].join("\n");

function overlayFor(text: string): GraphDiffOverlay {
  const paths = pathsFromUnifiedDiff(text);
  return attachLineDiff(
    {
      affectedModuleIds: new Set(paths.modified),
      deletedModuleIds: new Set(paths.deleted),
      ...emptySets,
      beforeLayout: null,
    },
    text,
  );
}

function makeFrame(overrides: Partial<PreviewFrame> = {}): PreviewFrame {
  return {
    id: 1,
    moduleId: "src/core/store.ts",
    moduleLabel: "store.ts",
    symbolName: null,
    modulePath: "src/core/store.ts",
    color: "#64748b",
    sourceText: "context\nadded",
    top: 0,
    left: 0,
    zIndex: 0,
    pinned: false,
    ...overrides,
  };
}

describe("Preview frame diff review toggle", () => {
  it("renders a checkbox in the header when the file is part of the active diff", () => {
    const overlay = overlayFor(DIFF_TEXT);
    const handlers = {
      onClose: vi.fn(),
      onMove: vi.fn(),
      onActivate: vi.fn(),
      onTogglePin: vi.fn(),
      onToggleDiffReview: vi.fn(),
      onNavigate: vi.fn(),
      onOpenWikiLink: vi.fn(),
    };

    render(
      <PreviewFramesView
        frames={[makeFrame()]}
        clickableByModule={new Map()}
        diffOverlay={overlay}
        diffReviewedIds={new Set()}
        handlers={handlers}
      />,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Mark file as reviewed" });
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
    expect(checkbox.closest("label")).toHaveAttribute("title", "Mark as reviewed");
  });

  it("renders checked with appropriate tooltip when file is already reviewed", () => {
    const overlay = overlayFor(DIFF_TEXT);
    const handlers = {
      onClose: vi.fn(),
      onMove: vi.fn(),
      onActivate: vi.fn(),
      onTogglePin: vi.fn(),
      onToggleDiffReview: vi.fn(),
      onNavigate: vi.fn(),
      onOpenWikiLink: vi.fn(),
    };

    render(
      <PreviewFramesView
        frames={[makeFrame()]}
        clickableByModule={new Map()}
        diffOverlay={overlay}
        diffReviewedIds={new Set(["src/core/store.ts"])}
        handlers={handlers}
      />,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Unmark file as reviewed" });
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toBeChecked();
    expect(checkbox.closest("label")).toHaveAttribute("title", "Reviewed — click to unmark");
  });

  it("calls onToggleDiffReview when clicked", () => {
    const overlay = overlayFor(DIFF_TEXT);
    const onToggle = vi.fn();
    const handlers = {
      onClose: vi.fn(),
      onMove: vi.fn(),
      onActivate: vi.fn(),
      onTogglePin: vi.fn(),
      onToggleDiffReview: onToggle,
      onNavigate: vi.fn(),
      onOpenWikiLink: vi.fn(),
    };

    render(
      <PreviewFramesView
        frames={[makeFrame()]}
        clickableByModule={new Map()}
        diffOverlay={overlay}
        diffReviewedIds={new Set()}
        handlers={handlers}
      />,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Mark file as reviewed" });
    fireEvent.click(checkbox);
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith("src/core/store.ts");
  });

  it("does not render the checkbox when the file is not part of the active diff", () => {
    const overlay = overlayFor(DIFF_TEXT);
    const handlers = {
      onClose: vi.fn(),
      onMove: vi.fn(),
      onActivate: vi.fn(),
      onTogglePin: vi.fn(),
      onToggleDiffReview: vi.fn(),
      onNavigate: vi.fn(),
      onOpenWikiLink: vi.fn(),
    };

    render(
      <PreviewFramesView
        frames={[makeFrame({ moduleId: "src/other.ts", modulePath: "src/other.ts" })]}
        clickableByModule={new Map()}
        diffOverlay={overlay}
        diffReviewedIds={new Set()}
        handlers={handlers}
      />,
    );

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("does not render the checkbox when diff overlay is inactive", () => {
    const handlers = {
      onClose: vi.fn(),
      onMove: vi.fn(),
      onActivate: vi.fn(),
      onTogglePin: vi.fn(),
      onToggleDiffReview: vi.fn(),
      onNavigate: vi.fn(),
      onOpenWikiLink: vi.fn(),
    };

    render(
      <PreviewFramesView
        frames={[makeFrame()]}
        clickableByModule={new Map()}
        diffOverlay={null}
        handlers={handlers}
      />,
    );

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});
