/// <reference types="@testing-library/jest-dom" />
import { act, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReviewNotesStore } from "../src/state/review-notes";
import { createMemoryReviewNotesClient } from "../src/ipc/review-notes-client";
import { readyGraphStore, renderGraphCanvas } from "./helpers/flow-graph-canvas";

const existingDocument = {
  version: 1 as const,
  notes: [{
    id: "existing",
    path: "src/core/store.ts",
    startLine: 1,
    endLine: 1,
    anchorLines: ["source line"],
    body: "Existing note",
  }],
};

describe("Review Note canvas badges", () => {
  it("updates a module count as soon as a note is created", async () => {
    const graphStore = await readyGraphStore();
    const reviewNotes = new ReviewNotesStore(createMemoryReviewNotesClient(existingDocument));
    await reviewNotes.loadProject({ root: "/sample", graph: graphStore.getGraph()! });
    const { container } = renderGraphCanvas(graphStore, undefined, reviewNotes);
    const badge = () => container.querySelector(
      '[data-id="src/core/store.ts"] [data-review-note-badge]',
    );

    expect(badge()).toHaveTextContent("1");
    act(() => {
      reviewNotes.beginDraft({
        path: "src/core/store.ts",
        startLine: 1,
        endLine: 1,
        anchorLines: ["source line"],
      });
      reviewNotes.confirmDraft("Check this line");
    });

    await waitFor(() => {
      expect(badge()).toHaveTextContent("2");
    });
  });
});
