import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { useState } from "react";
import { DiffCodeLines } from "../src/features/graph_canvas/Private/highlight/DiffCodeLines";
import { ReviewStackDrawer, ReviewStackProvider } from "../src/features/review_stack";
import { useReviewStackNavigation } from "../src/features/graph_canvas/Private/review-stack-canvas";
import { createMarkdownFramePreview } from "../src/features/graph_canvas/Private/preview_frames/markdown-frame-preview";
import type { PreviewFrame } from "../src/features/graph_canvas/Private/preview_frames/frame-list";
import { ProgrammaticMoveGuard } from "../src/features/graph_canvas/Private/navigation/programmatic-move-guard";
import { createMemoryReviewStackClient, type ReviewCohort } from "../src/ipc/review-stack-client";
import { ReviewStackStore } from "../src/state/review-stack";
import { GraphSessionStore } from "../src/state/graph-session";
import { createMockAnalysisClient } from "../src/ipc/analysis-client";
import { createMockGitClient } from "../src/ipc/git-client";
import { ElkLayoutEngine } from "../src/domain/layout";

const COHORT: ReviewCohort = {
  id: "c1",
  title: "Model",
  rationale: "Adds **ownership**",
  explanation: "## Walkthrough\nFirst the model.",
  dependsOn: [],
  moduleIds: [],
  hunks: [{ path: "src/a.ts", side: "after", startLine: 2, endLine: 3 }],
};

async function stackWithCohort() {
  const store = new ReviewStackStore(createMemoryReviewStackClient());
  await store.activateDiff("/repo", "paste:1");
  await store.setStack({ title: "Demo", summary: "Uses `code`", cohorts: [COHORT], blockers: [] });
  return store;
}

describe("DiffCodeLines with a Review Stack", () => {
  it("renders agent Diff Notes and bands only the spotlighted cohort's rows", async () => {
    const store = await stackWithCohort();
    await store.upsertDiffNotes([
      { id: "n1", path: "src/a.ts", side: "after", startLine: 1, endLine: 1, body: "Agent says **why**" },
    ]);
    const { container } = render(
      <ReviewStackProvider store={store}>
        <DiffCodeLines source={"a\nb\nc\nd"} path="src/a.ts" />
      </ReviewStackProvider>,
    );
    expect(screen.getByText("why").tagName).toBe("STRONG");
    expect(container.querySelectorAll(".diff-code__line--cohort")).toHaveLength(0);

    act(() => store.focusCohort("c1"));
    const banded = [...container.querySelectorAll(".diff-code__line--cohort")];
    expect(banded.map((row) => row.getAttribute("data-line"))).toEqual(["2", "3"]);
  });
});

async function diffSession() {
  const session = new GraphSessionStore(createMockAnalysisClient(), createMockGitClient(), new ElkLayoutEngine());
  await session.loadProject("/repo");
  await session.applyDiffFromPaste("--- a/src/a.ts\n+++ b/src/a.ts\n@@ -1,1 +1,1 @@\n-a\n+b");
  return session;
}

/** jsdom's PointerEvent drops `clientX`; a MouseEvent carries it under the pointer type. */
function pointer(type: string, clientX: number): Event {
  return Object.assign(new MouseEvent(type, { bubbles: true, cancelable: true, clientX }), { pointerId: 1 });
}

describe("ReviewStackDrawer cohorts", () => {
  it("renders markdown, opens the explanation, and lists hunks", async () => {
    const session = await diffSession();
    const store = await stackWithCohort();
    render(<ReviewStackDrawer stackStore={store} sessionStore={session} />);

    expect(screen.getByText("ownership").tagName).toBe("STRONG");
    expect(screen.getByText("code").tagName).toBe("CODE");

    fireEvent.click(screen.getByRole("button", { name: /Read explanation/ }));
    expect(store.getExplanationRequest()?.cohortId).toBe("c1");

    fireEvent.click(screen.getByText("Model"));
    expect(screen.getByText("L2–3")).toBeInTheDocument();
  });

  it("resizes from its right edge, clamps, and keeps the width while collapsed", async () => {
    const session = await diffSession();
    const store = await stackWithCohort();
    render(<ReviewStackDrawer stackStore={store} sessionStore={session} />);
    const handle = screen.getByRole("separator", { name: "Resize Review Stack" });
    handle.setPointerCapture = vi.fn();
    handle.releasePointerCapture = vi.fn();

    act(() => void handle.dispatchEvent(pointer("pointerdown", 310)));
    act(() => void handle.dispatchEvent(pointer("pointermove", 410)));
    expect(screen.getByRole("complementary", { name: "Review Stack" }).style.width).toBe("410px");
    act(() => void handle.dispatchEvent(pointer("pointermove", 5000)));
    act(() => void handle.dispatchEvent(pointer("pointerup", 5000)));
    expect(handle.getAttribute("aria-valuenow")).toBe("720");

    act(() => store.setDrawerOpen(/*open=*/false));
    act(() => store.setDrawerOpen(/*open=*/true));
    expect(screen.getByRole("complementary", { name: "Review Stack" }).style.width).toBe("720px");
  });
});

describe("cohort explanation frame", () => {
  it("consumes the request once and opens a pinned markdown frame", async () => {
    const store = await stackWithCohort();
    const session = await diffSession();
    const openMarkdown = vi.fn();
    const { rerender } = renderHook(() =>
      useReviewStackNavigation({
        store: session, reviewStack: store, openPreview: async () => undefined,
        openMarkdown, guard: new ProgrammaticMoveGuard(),
      }),
    );
    act(() => void store.requestExplanation("c1"));
    rerender();
    rerender();
    expect(openMarkdown).toHaveBeenCalledTimes(1);
    expect(openMarkdown).toHaveBeenCalledWith({
      key: "review-stack:c1", title: "Model", markdown: COHORT.explanation,
    });
    expect(store.getExplanationRequest()).toBeNull();
  });

  it("builds a pinned markdown frame and reuses it for the same key", () => {
    const container = document.createElement("div");
    const { result } = renderHook(() => {
      const [frames, setFrames] = useState<readonly PreviewFrame[]>([]);
      const open = createMarkdownFramePreview({ containerRef: { current: container }, nextId: { current: 1 }, setFrames });
      return { frames, open };
    });
    act(() => result.current.open({ key: "review-stack:c1", title: "Model", markdown: "# A" }));
    act(() => result.current.open({ key: "review-stack:c1", title: "Model", markdown: "# B" }));
    expect(result.current.frames).toHaveLength(1);
    expect(result.current.frames[0]).toMatchObject({ isMarkdown: true, pinned: true, sourceText: "# B" });
  });
});
