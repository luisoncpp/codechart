import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DiffCodeLines } from "../src/features/graph_canvas/Private/DiffCodeLines";
import { ReviewNotesProvider } from "../src/features/review_notes";
import { ReviewNotesStore, useReviewNotes } from "../src/state/review-notes";
import type { ReviewNotesClient } from "../src/ipc/review-notes-client";

function store() {
  const client: ReviewNotesClient = { loadReviewNotes: async () => ({ version: 1, notes: [] }), saveReviewNotes: async () => undefined };
  return new ReviewNotesStore(client);
}

function ReviewableSource({ notes, source = "one\ntwo\nthree" }: { notes: ReviewNotesStore; source?: string }) {
  useReviewNotes(notes);
  return <ReviewNotesProvider store={notes}><pre><DiffCodeLines source={source} path="src/a.ts" /></pre></ReviewNotesProvider>;
}

describe("Review Note source selection", () => {
  it("selects one line and extends an inclusive range with Shift-click", () => {
    const notes = store();
    render(<ReviewableSource notes={notes} />);
    const lines = screen.getAllByRole("button");
    fireEvent.click(lines[0]!);
    expect(notes.getDraft()).toMatchObject({ startLine: 1, endLine: 1, anchorLines: ["one"] });
    fireEvent.click(lines[2]!, { shiftKey: true });
    expect(notes.getDraft()).toMatchObject({ startLine: 1, endLine: 3, anchorLines: ["one", "two", "three"] });
  });

  it("keeps draft typing local until the note is submitted", () => {
    const notes = store();
    render(<ReviewableSource notes={notes} />);
    fireEvent.click(screen.getAllByRole("button")[0]!);

    let notifications = 0;
    const onChange = () => { notifications += 1; };
    notes.onChange(onChange);
    fireEvent.change(screen.getByLabelText("New Review Note"), { target: { value: "Revisit this" } });
    notes.offChange(onChange);

    expect(notifications).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Add Review Note" }));
    expect(notes.getDocument().notes).toMatchObject([{ body: "Revisit this", startLine: 1 }]);
  });

  it("inserts an expandable range note after its final anchored line", () => {
    const notes = store();
    notes.beginDraft({ path: "src/a.ts", startLine: 1, endLine: 2, anchorLines: ["one", "two"] });
    notes.confirmDraft("Review this range");
    render(<ReviewableSource notes={notes} />);

    const lines = document.querySelectorAll(".diff-code__line");
    const header = screen.getByRole("button", { name: "Review Note on lines 1–2" });
    expect(lines[1]!.compareDocumentPosition(header)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(header.compareDocumentPosition(lines[2]!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(header).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(header);
    expect(header).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText("Review Note Review this range")).toBeNull();
  });
});
