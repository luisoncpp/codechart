import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import graphJson from "./fixtures/golden/project-graph.json";
import { InspectionPanel } from "../src/features/inspection_panel";
import { ReviewNotesStore } from "../src/state/review-notes";
import type { ProjectGraph } from "../src/domain/graph";
import type { ReviewNotesClient } from "../src/ipc/review-notes-client";
import { testGraphSessionStore } from "./helpers/test-graph-session-store";

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
});
