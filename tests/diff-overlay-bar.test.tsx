import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DiffOverlayBar } from "../src/features/diff_visualizer";
import { GraphSessionStore } from "../src/state/graph-session";
import { createMockAnalysisClient } from "../src/ipc/analysis-client";
import { createMockGitClient } from "../src/ipc/git-client";
import { createMemoryDiffReviewClient } from "../src/ipc/diff-review-client";
import { ElkLayoutEngine } from "../src/domain/layout";

const PASTE = "diff --git a/src/core/store.ts b/src/core/store.ts\n";

async function storeWithDiff(): Promise<GraphSessionStore> {
  const store = new GraphSessionStore(
    createMockAnalysisClient(),
    createMockGitClient(),
    new ElkLayoutEngine(),
    createMemoryDiffReviewClient(),
  );
  await store.loadProject("/repo");
  await store.applyDiffFromPaste(PASTE);
  return store;
}

describe("DiffOverlayBar review checklist", () => {
  it("shows review progress and toggles a file from the checklist", async () => {
    const store = await storeWithDiff();
    render(<DiffOverlayBar store={store} onStop={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: /Reviewed 0\/1/ }));
    fireEvent.click(screen.getByRole("checkbox"));

    expect(store.getDiffReviewedIds().has("src/core/store.ts")).toBe(true);
    expect(screen.getByRole("button", { name: /Reviewed 1\/1/ })).toBeTruthy();
  });

  it("restores persisted progress for a re-applied diff", async () => {
    const store = await storeWithDiff();
    store.toggleDiffReviewed("src/core/store.ts");
    await new Promise((resolve) => setTimeout(resolve, 0));
    store.clearDiffOverlay();
    await store.applyDiffFromPaste(PASTE);

    render(<DiffOverlayBar store={store} onStop={() => {}} />);

    expect(screen.getByRole("button", { name: /Reviewed 1\/1/ })).toBeTruthy();
  });
});
