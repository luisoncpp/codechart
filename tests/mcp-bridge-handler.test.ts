import { describe, expect, it } from "vitest";
import { McpBridgeHandler } from "../src/app/Private/mcp-bridge-handler";
import { createMemoryReviewStackClient, type ReviewStackClient } from "../src/ipc/review-stack-client";
import { ReviewStackStore } from "../src/state/review-stack";
import { ReviewNotesStore } from "../src/state/review-notes";
import { createMemoryReviewNotesClient } from "../src/ipc/review-notes-client";
import { GraphSessionStore } from "../src/state/graph-session";
import type { AnalysisClient } from "../src/ipc/analysis-client";
import type { GitClient } from "../src/ipc/git-client";
import type { LayoutEngine } from "../src/domain/layout";
import type { Diagnostic, ProjectGraph } from "../src/domain/graph";

const GRAPH: ProjectGraph = {
  version: 1,
  root: "/repo",
  groups: [
    { id: "core", label: "Core", parentId: null, facadeModuleIds: [], tags: [], facadeTags: {}, disconnectedByDefault: false, disconnectedModuleIds: [] },
  ],
  modules: [
    { id: "src/a.ts", path: "src/a.ts", label: "a.ts", language: "typescript", groupId: "core", isFacade: false, metrics: { loc: 5 }, exportedSymbols: [] },
    { id: "src/b.ts", path: "src/b.ts", label: "b.ts", language: "typescript", groupId: "core", isFacade: false, metrics: { loc: 5 }, exportedSymbols: [] },
  ],
  edges: [
    { id: "e1", source: "src/b.ts", target: "src/a.ts", kind: "import", isViolation: false, trigger: "" },
  ],
  diagnostics: [],
};

const analysisClient: AnalysisClient = {
  analyzeProject: async () => GRAPH,
  readModuleSource: async (_root, path) => `export const x = "${path}";\n`,
  searchModuleSources: async () => ({ matches: [], truncated: false }),
};

const gitClient: GitClient = {
  isGitRepo: async () => false,
  listCommits: async () => [],
  diffRefs: async () => "",
  diffWorkingTree: async () => "",
  listSubmodulePaths: async () => [],
  loadProjectSnapshot: async () => ({ graph: GRAPH, sources: {} }),
};

const layoutEngine: LayoutEngine = {
  layout: async () => ({
    groups: { core: { x: 0, y: 0, width: 300, height: 200 } },
    modules: {
      "src/a.ts": { x: 10, y: 10, width: 100, height: 60 },
      "src/b.ts": { x: 140, y: 10, width: 100, height: 60 },
    },
    symbols: {},
    descriptions: {},
    bounds: { width: 300, height: 200 },
  }),
};

const SAMPLE_DIFF = [
  "--- a/src/a.ts",
  "+++ b/src/a.ts",
  "@@ -1,1 +1,1 @@",
  '-export const x = "src/a.ts";',
  '+export const x = "updated";',
].join("\n");

describe("McpBridgeHandler", () => {
  it("loads a diff, sets a review stack, upserts findings, and reports review state", async () => {
    const session = new GraphSessionStore(analysisClient, gitClient, layoutEngine);
    await session.loadProject("/repo");
    const reviewNotes = new ReviewNotesStore(createMemoryReviewNotesClient());
    const client = createMemoryReviewStackClient();
    const reviewStack = new ReviewStackStore(client);
    const handler = new McpBridgeHandler({ session, reviewNotes, reviewStack, client });

    const loadRes = (await handler.handle({
      id: "1",
      method: "load_diff",
      params: { mode: "paste", diffText: SAMPLE_DIFF },
    })) as { diffId: string; affectedModuleIds: string[] };
    expect(loadRes.diffId).toMatch(/^paste:/);
    expect(loadRes.affectedModuleIds).toContain("src/a.ts");

    await handler.handle({
      id: "2",
      method: "set_review_stack",
      params: {
        title: "Update a.ts",
        summary: "Changes exported constant.",
        cohorts: [{ id: "c1", title: "Core", rationale: "Base", dependsOn: [], moduleIds: ["src/a.ts"] }],
        blockers: [],
      },
    });

    await handler.handle({
      id: "3",
      method: "upsert_findings",
      params: {
        findings: [{
          id: "f1",
          path: "src/a.ts",
          side: "after",
          startLine: 1,
          endLine: 1,
          severity: "minor",
          category: "style",
          title: "Rename x",
          body: "Use a descriptive name",
          blocker: false,
          status: "open",
        }],
      },
    });

    await handler.handle({
      id: "4",
      method: "set_files_reviewed",
      params: { paths: ["src/a.ts"], reviewed: true },
    });

    const state = (await handler.handle({
      id: "5",
      method: "get_review_state",
      params: { includeResolved: false },
    })) as { reviewedPaths: string[]; findings: unknown[] };
    expect(state.reviewedPaths).toEqual(["src/a.ts"]);
    expect(state.findings).toHaveLength(1);

    const nav = (await handler.handle({
      id: "6",
      method: "navigate_to",
      params: { path: "src/a.ts", line: 1, openPreview: true },
    })) as { navigated: boolean };
    expect(nav.navigated).toBe(true);
    expect(reviewStack.getNavigationRequest()?.path).toBe("src/a.ts");
  });

  it("upserts agent Diff Notes and opens a cohort's explanation on focus_layer", async () => {
    const session = new GraphSessionStore(analysisClient, gitClient, layoutEngine);
    await session.loadProject("/repo");
    const client = createMemoryReviewStackClient();
    const reviewStack = new ReviewStackStore(client);
    const reviewNotes = new ReviewNotesStore(createMemoryReviewNotesClient());
    const handler = new McpBridgeHandler({ session, reviewNotes, reviewStack, client });
    const call = (method: string, params: Record<string, unknown>) => handler.handle({ id: method, method, params });

    await call("load_diff", { mode: "paste", diffText: SAMPLE_DIFF });
    await call("set_review_stack", {
      title: "T",
      cohorts: [{
        id: "c1", title: "Core", rationale: "", dependsOn: [], moduleIds: [],
        explanation: "# Why", hunks: [{ path: "src/a.ts", side: "after", startLine: 1, endLine: 1 }],
      }],
    });
    const saved = (await call("upsert_diff_notes", {
      notes: [{ id: "n1", path: "src/a.ts", side: "after", startLine: 1, endLine: 1, body: "Because" }],
    })) as { count: number };
    expect(saved.count).toBe(1);

    const quiet = (await call("focus_layer", { cohortId: "c1", openExplanation: false })) as {
      moduleIds: string[]; explanationOpened: boolean;
    };
    expect(quiet.moduleIds).toEqual(["src/a.ts"]);
    expect(quiet.explanationOpened).toBe(false);
    expect(reviewStack.getExplanationRequest()).toBeNull();

    const opened = (await call("focus_layer", { cohortId: "c1" })) as { explanationOpened: boolean };
    expect(opened.explanationOpened).toBe(true);
    expect(reviewStack.getExplanationRequest()?.markdown).toBe("# Why");

    const state = (await call("get_review_state", {})) as { diffNotes: unknown[] };
    expect(state.diffNotes).toHaveLength(1);
  });

  it("passes the diff's before-graph so live analyze_diff_impact reports new diagnostics", async () => {
    const cycle: Diagnostic = {
      id: "circularDependency:src/a.ts,src/b.ts:src/a.ts",
      severity: "warning",
      kind: "circularDependency",
      message: "circular include (2 modules): src/a.ts → src/b.ts",
      moduleId: "src/a.ts",
    };
    const after: ProjectGraph = { ...GRAPH, diagnostics: [cycle] };
    const session = new GraphSessionStore(
      { ...analysisClient, analyzeProject: async () => after },
      {
        ...gitClient,
        diffWorkingTree: async () => SAMPLE_DIFF,
        loadProjectSnapshot: async () => ({ graph: GRAPH, sources: {} }),
      },
      layoutEngine,
    );
    await session.loadProject("/repo");
    const { handler, calls } = spyHandler(session);

    const report = (await handler.handle({
      id: "1",
      method: "analyze_diff_impact",
      params: { mode: "working-tree", baseRef: "HEAD" },
    })) as { newDiagnostics: Diagnostic[]; newDiagnosticsAvailable: boolean };

    expect(calls[0]?.before?.diagnostics).toEqual([]);
    expect(calls[0]?.after.diagnostics).toEqual([cycle]);
    expect(report.newDiagnostics).toEqual([cycle]);
    expect(report.newDiagnosticsAvailable).toBe(true);
  });

  it("flags newDiagnostics as unavailable for paste diffs (no before-graph)", async () => {
    const session = new GraphSessionStore(analysisClient, gitClient, layoutEngine);
    await session.loadProject("/repo");
    const { handler, calls } = spyHandler(session);

    const report = (await handler.handle({
      id: "1",
      method: "analyze_diff_impact",
      params: { mode: "paste", diffText: SAMPLE_DIFF },
    })) as { newDiagnosticsAvailable: boolean };

    expect(calls[0]?.before ?? null).toBeNull();
    expect(report.newDiagnosticsAvailable).toBe(false);
  });
});

type ImpactArgs = Parameters<ReviewStackClient["analyzeDiffImpact"]>[0];

/** Handler whose impact client records every `analyzeDiffImpact` call. */
function spyHandler(session: GraphSessionStore) {
  const inner = createMemoryReviewStackClient();
  const calls: ImpactArgs[] = [];
  const client: ReviewStackClient = {
    ...inner,
    analyzeDiffImpact: (args) => (calls.push(args), inner.analyzeDiffImpact(args)),
  };
  const reviewNotes = new ReviewNotesStore(createMemoryReviewNotesClient());
  const handler = new McpBridgeHandler({ session, reviewNotes, reviewStack: new ReviewStackStore(client), client });
  return { handler, calls };
}
