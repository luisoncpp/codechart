import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import graphJson from "./fixtures/golden/project-graph.json";
import { InspectionPanel } from "../src/features/inspection_panel";
import { ReviewNotesStore } from "../src/state/review-notes";
import type { ProjectGraph } from "../src/domain/graph";
import type { ReviewNotesClient } from "../src/ipc/review-notes-client";
import { createMockShellClient } from "../src/ipc/shell-client";
import { ReviewNotesSidebar } from "../src/features/review_notes";
import { testGraphSessionStore } from "./helpers/test-graph-session-store";
import { renderGraphCanvas } from "./helpers/flow-graph-canvas";

const graph = graphJson as unknown as ProjectGraph;

describe("Review Notes sidebar integration", () => {
  it("switches tabs while retaining the same panel shell", async () => {
    const session = testGraphSessionStore();
    await session.loadProject("/sample");
    const client: ReviewNotesClient = {
      loadReviewNotes: async () => ({ version: 1, notes: [{ id: "n", path: "src/main.ts", startLine: 1, endLine: 1, anchorLines: ["x"], body: "Review the entry point" }] }),
      saveReviewNotes: async () => undefined,
    };
    const notes = new ReviewNotesStore(client);
    await notes.loadProject({ root: "/sample", graph });
    function Shell() {
      const [tab, setTab] = useState<"inspector" | "review-notes">("review-notes");
      return <InspectionPanel store={session} reviewNotes={notes} activeTab={tab} onTabChange={setTab} width={360} onWidthChange={() => undefined} />;
    }
    render(<Shell />);
    expect(screen.getByText("Review the entry point")).toBeInTheDocument();
    expect(document.querySelector("aside")).toHaveStyle({ width: "360px" });
    fireEvent.click(screen.getByRole("button", { name: "Inspector" }));
    expect(screen.getByText("Select a module or group to inspect it.")).toBeInTheDocument();
    expect(document.querySelector("aside")).toHaveStyle({ width: "360px" });
  });

  it("resolves individual and all visible Review Notes", async () => {
    const notesDocument = { version: 1 as const, notes: [
      { id: "a", path: "src/main.ts", startLine: 1, endLine: 1, anchorLines: ["a"], body: "Review entry point" },
      { id: "b", path: "src/main.ts", startLine: 2, endLine: 2, anchorLines: ["b"], body: "Review initialization" },
    ] };
    const saveReviewNotes = vi.fn().mockResolvedValue(undefined);
    const notes = new ReviewNotesStore({
      loadReviewNotes: async () => notesDocument,
      saveReviewNotes,
    });
    await notes.loadProject({ root: "/sample", graph });
    render(<ReviewNotesSidebar store={notes} />);

    fireEvent.click(screen.getByRole("button", { name: "Resolve Review Note at src/main.ts:1" }));
    expect(screen.queryByText("Review entry point")).not.toBeInTheDocument();
    expect(screen.getByText("1 active Review Note")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Resolve all" }));
    expect(screen.getByText("0 active Review Notes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resolve all" })).toBeDisabled();
    await waitFor(() => expect(saveReviewNotes).toHaveBeenCalled());
  });

  it("focuses the note's module when opening its preview", async () => {
    const session = testGraphSessionStore();
    await session.loadProject("/sample");
    const note = { id: "n", path: "src/main.ts", startLine: 1, endLine: 1, anchorLines: ["x"], body: "Review the entry point" };
    const client: ReviewNotesClient = {
      loadReviewNotes: async () => ({ version: 1, notes: [note] }),
      saveReviewNotes: async () => undefined,
    };
    const notes = new ReviewNotesStore(client);
    await notes.loadProject({ root: "/sample", graph });
    const focusOn = vi.spyOn(session, "focusOn");

    renderGraphCanvas(session, createMockShellClient(), notes);
    render(<ReviewNotesSidebar store={notes} />);
    fireEvent.click(screen.getByRole("button", { name: /Review the entry point/ }));

    await waitFor(() => expect(focusOn).toHaveBeenCalledWith("src/main.ts"));
    await waitFor(() => expect(document.querySelector(".symbol-widget")).toBeTruthy());
  });
});
