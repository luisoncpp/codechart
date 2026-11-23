import { describe, expect, it } from "vitest";
import { act, render, renderHook } from "@testing-library/react";
import { usePreviewFrames } from "../src/features/graph_canvas/Private/preview_frames";
import { GraphSessionStore } from "../src/state/graph-session";
import { createMockAnalysisClient } from "../src/ipc/analysis-client";
import { createMockGitClient } from "../src/ipc/git-client";
import { ElkLayoutEngine } from "../src/domain/layout";

/**
 * A real click runs React's root listener, then a microtask checkpoint, then
 * the document listener. A sidebar navigation (Review Stack drawer, Review
 * Notes tab) can open its frame entirely inside that checkpoint, so the same
 * click's outside-click handler must not close it.
 */
describe("sidebar-opened preview frames", () => {
  it("survive the outside-click handler of the click that opened them", async () => {
    const store = new GraphSessionStore(createMockAnalysisClient(), createMockGitClient(), new ElkLayoutEngine());
    await store.loadProject("/repo");
    const graph = store.getGraph()!;
    const module = graph.modules[0]!;
    const container = document.createElement("div");
    document.body.appendChild(container);
    const { result } = renderHook(() =>
      usePreviewFrames({
        store, graph, diffOverlay: null, containerRef: { current: container }, getFindQuery: () => "",
      }),
    );
    // A pinned frame keeps the outside-click listener attached (lesson pinned-frames-keep-close-listener-armed).
    act(() => result.current.openMarkdownFrame({ key: "pinned", title: "Pinned", markdown: "# x" }));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

    await act(async () => {
      await result.current.openReviewNotePreview({ path: module.path, startLine: 1, endLine: 1 });
      // The opening click now bubbles to the document listener.
      document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const { container: view } = render(<>{result.current.framesView}</>);
    const frames = [...view.querySelectorAll(".symbol-widget")];
    expect(frames).toHaveLength(2);
    expect(frames.some((frame) => frame.textContent?.includes(module.label))).toBe(true);
  });
});
