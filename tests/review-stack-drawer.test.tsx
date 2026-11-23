import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ReviewStackDrawer } from "../src/features/review_stack";
import { createMemoryReviewStackClient } from "../src/ipc/review-stack-client";
import { ReviewStackStore } from "../src/state/review-stack";
import { GraphSessionStore } from "../src/state/graph-session";
import type { AnalysisClient } from "../src/ipc/analysis-client";
import type { GitClient } from "../src/ipc/git-client";
import type { LayoutEngine } from "../src/domain/layout";
import type { ProjectGraph } from "../src/domain/graph";

const GRAPH: ProjectGraph = {
  version: 1,
  root: "/repo",
  groups: [],
  modules: [
    { id: "src/a.ts", path: "src/a.ts", label: "a.ts", language: "typescript", groupId: null, isFacade: false, metrics: { loc: 5 }, exportedSymbols: [] },
  ],
  edges: [],
  diagnostics: [],
};

const analysis: AnalysisClient = {
  analyzeProject: async () => GRAPH,
  readModuleSource: async () => 'export const a = 1;\n',
  searchModuleSources: async () => ({ matches: [], truncated: false }),
};

const git: GitClient = {
  isGitRepo: async () => false,
  listCommits: async () => [],
  diffRefs: async () => "",
  diffWorkingTree: async () => "",
  listSubmodulePaths: async () => [],
  loadProjectSnapshot: async () => ({ graph: GRAPH, sources: {} }),
};

const layout: LayoutEngine = {
  layout: async () => ({
    groups: {},
    modules: { "src/a.ts": { x: 0, y: 0, width: 100, height: 60 } },
    symbols: {},
    descriptions: {},
    bounds: { width: 100, height: 60 },
  }),
};

describe("ReviewStackDrawer", () => {
  it("renders cohorts, spotlights on click, filters findings, and resolves them", async () => {
    const session = new GraphSessionStore(analysis, git, layout);
    await session.loadProject("/repo");
    await session.applyDiffFromPaste("--- a/src/a.ts\n+++ b/src/a.ts\n@@ -1,1 +1,1 @@\n-export const a = 1;\n+export const a = 2;");

    const stackStore = new ReviewStackStore(createMemoryReviewStackClient());
    await stackStore.activateDiff("/repo", session.getActiveDiffId()!);
    await stackStore.setStack({
      title: "Demo MR",
      summary: "Updates constant a.",
      cohorts: [{ id: "c1", title: "Foundation", rationale: "Base layer", dependsOn: [], moduleIds: ["src/a.ts"] }],
      blockers: [],
    });
    await stackStore.upsertFindings([{
      id: "f1",
      path: "src/a.ts",
      side: "after",
      startLine: 1,
      endLine: 1,
      severity: "critical",
      category: "bug",
      title: "Wrong value",
      body: "Expected 3",
      blocker: true,
      status: "open",
    }]);

    render(<ReviewStackDrawer stackStore={stackStore} sessionStore={session} />);

    expect(screen.getByText("Demo MR")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Foundation"));
    expect(stackStore.getActiveCohortId()).toBe("c1");

    fireEvent.click(screen.getByRole("tab", { name: /Findings/ }));
    expect(screen.getByText("Wrong value")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "✓ Resolve" }));
    expect(await screen.findByRole("button", { name: "Reopen" })).toBeInTheDocument();
  });
});
