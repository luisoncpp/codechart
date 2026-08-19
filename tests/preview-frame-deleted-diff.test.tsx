/// <reference types="@testing-library/jest-dom" />
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PreviewFramesView } from "../src/features/graph_canvas/Private/preview_frames/PreviewFramesView";
import type { PreviewFrame } from "../src/features/graph_canvas/Private/preview_frames/frame-list";
import { fileDiffForPreview } from "../src/features/graph_canvas/Private/preview_frames/preview-file-diff";
import {
  attachDeletedBeforeSources,
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
};

const DELETED_DIFF = [
  "diff --git a/src/gone.ts b/src/gone.ts",
  "deleted file mode 100644",
  "--- a/src/gone.ts",
  "+++ /dev/null",
  "@@ -1,3 +0,0 @@",
  "-export function gone() {",
  "-  return true;",
  "-}",
].join("\n");

function overlayFromDiff(text: string): GraphDiffOverlay {
  const paths = pathsFromUnifiedDiff(text);
  return attachDeletedBeforeSources(
    attachLineDiff({
      affectedModuleIds: new Set(),
      deletedModuleIds: new Set(paths.deleted),
      ...emptySets,
      beforeLayout: null,
    }, text),
  );
}

function makeFrame(overrides: Partial<PreviewFrame> = {}): PreviewFrame {
  return {
    id: 1,
    moduleId: "src/gone.ts",
    moduleLabel: "gone.ts",
    symbolName: null,
    modulePath: "src/gone.ts",
    color: "#64748b",
    sourceText: "",
    top: 0,
    left: 0,
    zIndex: 0,
    pinned: false,
    ...overrides,
  };
}

function renderFrame(frame: PreviewFrame, overlay: GraphDiffOverlay) {
  const handlers = {
    onClose: vi.fn(),
    onMove: vi.fn(),
    onActivate: vi.fn(),
    onTogglePin: vi.fn(),
    onNavigate: vi.fn(),
    onOpenWikiLink: vi.fn(),
  };
  const { container } = render(
    <PreviewFramesView
      frames={[frame]}
      clickableByModule={new Map()}
      diffOverlay={overlay}
      handlers={handlers}
    />,
  );
  return {
    addCount: container.querySelectorAll(".symbol-widget__line--add").length,
    removeCount: container.querySelectorAll(".symbol-widget__line--remove").length,
    contextCount: container.querySelectorAll(".symbol-widget__line--context").length,
    text: container.textContent ?? "",
  };
}

describe("Preview frame for a deleted file in diff view", () => {
  it("shows every line as a red removal", () => {
    const overlay = overlayFromDiff(DELETED_DIFF);
    expect(overlay.beforeSourceByPath.get("src/gone.ts")).toContain("export function gone()");

    const rendered = renderFrame(makeFrame(), overlay);
    expect(rendered.removeCount).toBe(3);
    expect(rendered.addCount).toBe(0);
    expect(rendered.contextCount).toBe(0);
    expect(rendered.text).toContain("-export function gone() {");
  });

  it("prefers snapshot text over reconstructed hunks", () => {
    const overlay = attachDeletedBeforeSources(
      overlayFromDiff(DELETED_DIFF),
      new Map([["src/gone.ts", "from snapshot"]]),
    );
    expect(overlay.beforeSourceByPath.get("src/gone.ts")).toBe("from snapshot");
  });

  it("synthesizes an all-removed diff from the before snapshot when hunks are missing", () => {
    const overlay: GraphDiffOverlay = {
      ...attachLineDiff({
        affectedModuleIds: new Set(),
        deletedModuleIds: new Set(["src/gone.ts"]),
        ...emptySets,
        beforeLayout: null,
      }, null),
      beforeSourceByPath: new Map([["src/gone.ts", "const x = 1;\nconst y = 2;"]]),
    };

    const diff = fileDiffForPreview("src/gone.ts", overlay);
    expect(diff?.addedLineNumbers.size).toBe(0);
    expect(diff?.removeBeforeLine.get(1)).toEqual(["const x = 1;", "const y = 2;"]);

    const rendered = renderFrame(makeFrame(), overlay);
    expect(rendered.removeCount).toBe(2);
    expect(rendered.contextCount).toBe(0);
  });
});
