import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { DiffCodeLines } from "../src/features/graph_canvas/Private/highlight/DiffCodeLines";
import { DroppedMarkersWarning } from "../src/features/diff_visualizer";
import { ReviewNotesProvider } from "../src/features/review_notes";
import { ReviewNotesStore } from "../src/state/review-notes";
import type { ReviewNotesClient } from "../src/ipc/review-notes-client";
import type { DiffNote, FileLineDiff } from "../src/domain/diff";
import { GraphSessionStore } from "../src/state/graph-session";
import { createMockAnalysisClient } from "../src/ipc/analysis-client";
import { createMockGitClient } from "../src/ipc/git-client";
import { createMemoryDiffReviewClient } from "../src/ipc/diff-review-client";
import { ElkLayoutEngine } from "../src/domain/layout";

function createReviewStore() {
  const client: ReviewNotesClient = {
    loadReviewNotes: async () => ({ version: 1, notes: [] }),
    saveReviewNotes: async () => undefined,
  };
  return new ReviewNotesStore(client);
}

describe("DiffCodeLines with DiffNotes", () => {
  it("renders a Diff Note notice after an add/context row", () => {
    const notes: DiffNote[] = [
      {
        path: "src/a.ts",
        startLine: 1,
        endLine: 2,
        side: "after",
        body: "Note on lines 1-2",
      },
    ];

    render(
      <DiffCodeLines
        source={"const a = 1;\nconst b = 2;\nconst c = 3;"}
        path="src/a.ts"
        diffNotes={notes}
      />,
    );

    expect(screen.getByText("Diff Note")).toBeTruthy();
    expect(screen.getByText("Note on lines 1-2")).toBeTruthy();
  });

  it("renders a Diff Note notice after a remove row", () => {
    const fileDiff: FileLineDiff = {
      addedLineNumbers: new Set(),
      removedLineNumbers: new Set([1]),
      removeBeforeLine: new Map([[1, ["removed old line"]]]),
    };
    const notes: DiffNote[] = [
      {
        path: "src/a.ts",
        startLine: 1,
        endLine: 1,
        side: "before",
        body: "Explanation of removal",
      },
    ];

    render(
      <DiffCodeLines
        source={"const x = 1;"}
        path="src/a.ts"
        fileDiff={fileDiff}
        diffNotes={notes}
      />,
    );

    expect(screen.getByText("Diff Note")).toBeTruthy();
    expect(screen.getByText("Explanation of removal")).toBeTruthy();
  });

  it("stacks Diff Note above Review Note on the same line", async () => {
    const reviewStore = createReviewStore();
    reviewStore.beginDraft({
      path: "src/a.ts",
      startLine: 1,
      endLine: 1,
      anchorLines: ["const a = 1;"],
    });
    reviewStore.confirmDraft("Review comment");

    const diffNotes: DiffNote[] = [
      {
        path: "src/a.ts",
        startLine: 1,
        endLine: 1,
        side: "after",
        body: "Diff explanation",
      },
    ];

    const { container } = render(
      <ReviewNotesProvider store={reviewStore}>
        <DiffCodeLines
          source={"const a = 1;"}
          path="src/a.ts"
          diffNotes={diffNotes}
        />
      </ReviewNotesProvider>,
    );

    const diffNoteEl = container.querySelector(".diff-note-inline");
    const reviewNoteEl = container.querySelector(".review-note-inline");

    expect(diffNoteEl).toBeTruthy();
    expect(reviewNoteEl).toBeTruthy();
    // In DOM order, diffNoteEl must come before reviewNoteEl
    expect(
      diffNoteEl!.compareDocumentPosition(reviewNoteEl!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("starts expanded and toggles collapse locally without persistence", () => {
    const notes: DiffNote[] = [
      {
        path: "src/a.ts",
        startLine: 1,
        endLine: 1,
        side: "after",
        body: "Collapsible note",
      },
    ];

    const { rerender } = render(
      <DiffCodeLines source={"const a = 1;"} path="src/a.ts" diffNotes={notes} />,
    );

    expect(screen.getByText("Collapsible note")).toBeTruthy();

    const toggleBtn = screen.getByRole("button", { name: /Diff Note/ });
    fireEvent.click(toggleBtn);
    expect(screen.queryByText("Collapsible note")).toBeNull();

    // Remounting a new instance starts expanded
    rerender(
      <DiffCodeLines
        key="new-instance"
        source={"const a = 1;"}
        path="src/a.ts"
        diffNotes={notes}
      />,
    );
    expect(screen.getByText("Collapsible note")).toBeTruthy();
  });
});

describe("DroppedMarkersWarning", () => {
  it("renders dropped text, copies to clipboard, and closes on X", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const onClose = vi.fn();

    const { container } = render(
      <DroppedMarkersWarning
        text={"# Unbound marker line 1\n# Unbound marker line 2"}
        onClose={onClose}
      />,
    );

    expect(screen.getByText(/Unbound diff note markers dropped/)).toBeTruthy();
    expect(
      container.querySelector(".dropped-markers-warning__text")?.textContent,
    ).toBe("# Unbound marker line 1\n# Unbound marker line 2");

    const copyBtn = screen.getByRole("button", { name: /Copy dropped markers/i });
    await act(async () => {
      fireEvent.click(copyBtn);
    });
    expect(writeText).toHaveBeenCalledWith(
      "# Unbound marker line 1\n# Unbound marker line 2",
    );

    const closeBtn = screen.getByRole("button", { name: /Close warning/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});

describe("GraphSessionStore diffNotes warning lifecycle", () => {
  it("resets warning closed state when a diff is re-applied", async () => {
    const store = new GraphSessionStore(
      createMockAnalysisClient(),
      createMockGitClient(),
      new ElkLayoutEngine(),
      createMemoryDiffReviewClient(),
    );
    await store.loadProject("/repo");

    const patchWithDropped = [
      "# Leading dropped marker",
      "diff --git a/src/core/store.ts b/src/core/store.ts",
      "--- a/src/core/store.ts",
      "+++ b/src/core/store.ts",
      "@@ -1,2 +1,2 @@",
      "-old",
      "+new",
    ].join("\n");

    await store.applyDiffFromPaste(patchWithDropped);
    expect(store.getDiffOverlay()?.droppedMarkerText).toBe("# Leading dropped marker");
    expect(store.getDiffNotesWarningClosed()).toBe(false);

    store.closeDiffNotesWarning();
    expect(store.getDiffNotesWarningClosed()).toBe(true);

    // Re-applying the diff resets the closed flag
    await store.applyDiffFromPaste(patchWithDropped);
    expect(store.getDiffNotesWarningClosed()).toBe(false);
  });

  it("renders diff notes in preview frame for pasted snippet", async () => {
    const store = new GraphSessionStore(
      createMockAnalysisClient(),
      createMockGitClient(),
      new ElkLayoutEngine(),
      createMemoryDiffReviewClient(),
    );
    await store.loadProject("/repo");

    const snippet = [
      "# [Dropped Marker Test] This marker is before the first hunk so it will be dropped and trigger the warning panel!",
      "diff --git a/src/features/diff_visualizer/index.ts b/src/features/diff_visualizer/index.ts",
      "--- a/src/features/diff_visualizer/index.ts",
      "+++ b/src/features/diff_visualizer/index.ts",
      "@@ -1,5 +1,7 @@",
      " export { DiffModal } from \"./Private/DiffModal\";",
      " export { DiffOverlayBar } from \"./Private/DiffOverlayBar\";",
      "+export { DiffNotesList } from \"./Private/DiffNoteNotice\";",
      "# **New Export:** Exposes `DiffNotesList` for inline source view rendering in L2 and preview frames.",
      "+export { DroppedMarkersWarning } from \"./Private/DroppedMarkersWarning\";",
      "# **Warning Component:** Exposes the floating banner for unbound `#` markers.",
      " ",
      "diff --git a/src/domain/diff/index.ts b/src/domain/diff/index.ts",
      "--- a/src/domain/diff/index.ts",
      "+++ b/src/domain/diff/index.ts",
      "@@ -1,4 +1,4 @@",
      "-export type { GraphDiffOverlay, DiffNote, DiffNoteSide, DiffNoteParseResult } from \"./Private/types\";",
      "# **Refactored Type Exports:** Removed internal-only types `DiffNoteSide` and `DiffNoteParseResult`.",
      "+export type { GraphDiffOverlay, DiffNote } from \"./Private/types\";",
      " export type { FileLineDiff, DiffDisplayRow } from \"./Private/line-diff-types\";",
      " export { UNCHANGED_MODULE_DIFF_OPACITY } from \"./Private/line-diff-types\";",
    ].join("\n");

    await store.applyDiffFromPaste(snippet);
    const overlay = store.getDiffOverlay();
    expect(overlay).not.toBeNull();
    expect(overlay?.diffNotes).toHaveLength(3);

    const { PreviewFramesView } = await import("../src/features/graph_canvas/Private/preview_frames/PreviewFramesView");
    const frame = {
      id: 1,
      moduleId: "src/features/diff_visualizer/index.ts",
      moduleLabel: "index.ts",
      symbolName: null,
      modulePath: "src/features/diff_visualizer/index.ts",
      color: "#64748b",
      sourceText: "export { DiffModal } from \"./Private/DiffModal\";\nexport { DiffOverlayBar } from \"./Private/DiffOverlayBar\";\nexport { DiffNotesList } from \"./Private/DiffNoteNotice\";\nexport { DroppedMarkersWarning } from \"./Private/DroppedMarkersWarning\";\n\n",
      x: 0,
      y: 0,
      width: 400,
      height: 300,
      pinned: false,
      zIndex: 1,
    };

    const { container } = render(
      <PreviewFramesView
        frames={[frame]}
        clickableByModule={new Map()}
        diffOverlay={overlay}
        handlers={{
          onClose: vi.fn(),
          onMove: vi.fn(),
          onActivate: vi.fn(),
          onTogglePin: vi.fn(),
          onNavigate: vi.fn(),
          onOpenWikiLink: vi.fn(),
        }}
      />,
    );

    expect(screen.getAllByText("Diff Note").length).toBe(2);
    expect(screen.getByText(/New Export:/)).toBeTruthy();
    expect(screen.getByText(/Warning Component:/)).toBeTruthy();
  });
});
