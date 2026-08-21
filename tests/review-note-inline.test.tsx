import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { InlineReviewNotes, ReviewNotesProvider } from "../src/features/review_notes";
import { ReviewNotesStore } from "../src/state/review-notes";
import type { ReviewNotesClient } from "../src/ipc/review-notes-client";

function store() {
  const client: ReviewNotesClient = { loadReviewNotes: async () => ({ version: 1, notes: [] }), saveReviewNotes: async () => undefined };
  return new ReviewNotesStore(client);
}

describe("InlineReviewNotes", () => {
  it("keeps notes ending on the same line in creation order", () => {
    const notes = [
      { id: "first", path: "a.ts", startLine: 3, endLine: 3, anchorLines: ["a"], body: "first" },
      { id: "second", path: "a.ts", startLine: 3, endLine: 3, anchorLines: ["a"], body: "second" },
    ];
    render(<ReviewNotesProvider store={store()}><InlineReviewNotes notes={notes} showDraft={false} /></ReviewNotesProvider>);

    const bodies = screen.getAllByRole("textbox");
    expect(bodies.map((body) => body.getAttribute("aria-label"))).toEqual(["Review Note first", "Review Note second"]);
  });

  it("closes the draft card without adding a note", () => {
    const notes = store();
    notes.beginDraft({ path: "a.ts", startLine: 1, endLine: 1, anchorLines: ["a"] });
    render(<ReviewNotesProvider store={notes}><InlineReviewNotes notes={[]} showDraft /></ReviewNotesProvider>);

    fireEvent.click(screen.getByLabelText("Close New Review Note"));

    expect(notes.getDraft()).toBeNull();
    expect(notes.getDocument().notes).toHaveLength(0);
  });

  it("resolves an existing note using the header Resolve button and has no Done button", () => {
    const notes = store();
    notes.beginDraft({ path: "a.ts", startLine: 3, endLine: 3, anchorLines: ["a"] });
    notes.confirmDraft("Needs fix");
    render(<ReviewNotesProvider store={notes}><InlineReviewNotes notes={notes.getDocument().notes} showDraft={false} /></ReviewNotesProvider>);

    expect(screen.queryByRole("button", { name: "Done" })).toBeNull();
    const resolveBtn = screen.getByRole("button", { name: "Resolve Review Note on line 3" });
    expect(resolveBtn).toBeInTheDocument();
    expect(screen.getByText("Saved")).toBeInTheDocument();

    fireEvent.click(resolveBtn);
    expect(notes.getDocument().notes).toHaveLength(0);
  });
});
