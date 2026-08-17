/// <reference types="@testing-library/jest-dom" />
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PreviewFramesView } from "../src/features/graph_canvas/Private/preview_frames/PreviewFramesView";
import type { PreviewFrame } from "../src/features/graph_canvas/Private/preview_frames/frame-list";
import {
  attachLineDiff,
  attachRenames,
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

function overlayFromDiff(text: string): GraphDiffOverlay {
  const paths = pathsFromUnifiedDiff(text);
  return attachLineDiff({
    affectedModuleIds: new Set(paths.added),
    deletedModuleIds: new Set(paths.deleted),
    ...emptySets,
    renamePairs: paths.renames,
    beforeLayout: null,
  }, text);
}

const RENAMED_WITH_CHANGES_DIFF = [
  "diff --git a/src/old.ts b/src/old.ts",
  "deleted file mode 100644",
  "--- a/src/old.ts",
  "+++ /dev/null",
  "@@ -1,3 +0,0 @@",
  "-export function run() {",
  "-  return 1;",
  "-}",
  "diff --git a/src/new.ts b/src/new.ts",
  "new file mode 100644",
  "--- /dev/null",
  "+++ b/src/new.ts",
  "@@ -0,0 +1,4 @@",
  "+export function run() {",
  "+  return 2;",
  "+}",
  "+export const extra = true;",
].join("\n");

function makeFrame(overrides: Partial<PreviewFrame> = {}): PreviewFrame {
  return {
    id: 1,
    moduleId: "src/new.ts",
    moduleLabel: "new.ts",
    symbolName: "run",
    modulePath: "src/new.ts",
    color: "#64748b",
    sourceText: "export function run() {\n  return 2;\n}\nexport const extra = true;",
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

describe("Preview frame for renamed file in diff view", () => {
  it("shows actual changes vs original file instead of marking every line green", () => {
    const rawOverlay = overlayFromDiff(RENAMED_WITH_CHANGES_DIFF);
    expect(rawOverlay.lineDiffByPath.get("src/new.ts")?.addedLineNumbers.size).toBe(4);

    const overlay = attachRenames({ overlay: rawOverlay });
    const diff = overlay.lineDiffByPath.get("src/new.ts");
    expect(diff?.addedLineNumbers).toEqual(new Set([2, 4]));
    expect(diff?.removeBeforeLine.get(2)).toEqual(["  return 1;"]);

    const rendered = renderFrame(makeFrame(), overlay);
    expect(rendered.addCount).toBe(2);
    expect(rendered.removeCount).toBe(1);
    expect(rendered.contextCount).toBe(2);
    expect(rendered.text).toContain("-  return 1;");
    expect(rendered.text).toContain("+2  return 2;");
  });

  it("shows zero green lines for identically renamed file", () => {
    const identicalText = "export function run() {\n  return 1;\n}";
    const overlay = attachRenames({
      overlay: overlayFromDiff(""),
      beforeSources: new Map([["src/old.ts", identicalText]]),
      afterSources: new Map([["src/new.ts", identicalText]]),
      beforeModules: [dummyModule("src/old.ts")],
      afterModules: [dummyModule("src/new.ts")],
    });

    const frame = makeFrame({ sourceText: identicalText });
    const rendered = renderFrame(frame, overlay);

    expect(rendered.addCount).toBe(0);
    expect(rendered.removeCount).toBe(0);
    expect(rendered.contextCount).toBe(3);
  });
});

function dummyModule(id: string) {
  return {
    id,
    path: id,
    label: id.split("/").pop() ?? id,
    language: "typescript" as const,
    groupId: null,
    isFacade: false,
    metrics: { loc: 3 },
    exportedSymbols: ["run"],
  };
}
