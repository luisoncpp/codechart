import { describe, expect, it } from "vitest";
import { McpBridgeHandler } from "../src/app/Private/mcp-bridge-handler";
import { createMemoryReviewStackClient } from "../src/ipc/review-stack-client";
import { ReviewStackStore } from "../src/state/review-stack";
import { ReviewNotesStore } from "../src/state/review-notes";
import { createMemoryReviewNotesClient } from "../src/ipc/review-notes-client";
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
    { id: "a.ts", path: "a.ts", label: "a.ts", language: "typescript", groupId: null, isFacade: false, metrics: { loc: 1 }, exportedSymbols: [] },
  ],
  edges: [],
  diagnostics: [],
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
  layout: async () => ({ groups: [], modules: [], symbols: [], descriptions: [], width: 100, height: 60 }),
};

function setup() {
  const analyzed: string[] = [];
  const analysisClient: AnalysisClient = {
    analyzeProject: async (path) => {
      analyzed.push(path);
      return { ...GRAPH, root: path };
    },
    readModuleSource: async () => "",
    searchModuleSources: async () => ({ matches: [], truncated: false }),
  };
  const session = new GraphSessionStore(analysisClient, gitClient, layoutEngine);
  const client = createMemoryReviewStackClient();
  const reviewNotes = new ReviewNotesStore(createMemoryReviewNotesClient());
  const handler = new McpBridgeHandler({ session, reviewNotes, reviewStack: new ReviewStackStore(client), client });
  const open = (path: string) => handler.handle({ id: path, method: "open_project", params: { path } });
  const context = () => handler.handle({ id: "ctx", method: "get_active_context", params: {} }) as Promise<{ projectRoot: string; phase: string }>;
  return { session, analyzed, open, context };
}

async function waitForPhase(session: GraphSessionStore, phase: string) {
  while (session.getPhase() !== phase) await new Promise((resolve) => setTimeout(/*pollPhase*/ resolve, /*delayMs=*/ 1));
}

describe("McpBridgeHandler open_project", () => {
  it("starts loading the folder and replies before the analysis finishes", async () => {
    const { session, analyzed, open, context } = setup();
    expect(await open("/repo")).toEqual({ projectRoot: "/repo", reloaded: true });
    expect((await context()).phase).toBe("loading");
    await waitForPhase(session, "ready");
    expect(await context()).toMatchObject({ projectRoot: "/repo", phase: "ready", error: null });
    expect(analyzed).toEqual(["/repo"]);
  });

  it("does not reload a folder that is already open", async () => {
    const { session, analyzed, open } = setup();
    await session.loadProject("/repo");
    expect(await open("/repo")).toEqual({ projectRoot: "/repo", reloaded: false });
    expect(analyzed).toEqual(["/repo"]);
  });

  it("replaces a different open project", async () => {
    const { session, analyzed, open } = setup();
    await session.loadProject("/old");
    await open("/repo");
    await waitForPhase(session, "ready");
    expect(session.getProjectRoot()).toBe("/repo");
    expect(analyzed).toEqual(["/old", "/repo"]);
  });

  it("requires a path", async () => {
    const { open } = setup();
    await expect(open("  ")).rejects.toThrow("open_project requires a path.");
  });
});
