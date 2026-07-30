import { describe, expect, it } from "vitest";
import { GraphSessionStore } from "../src/state/graph-session";
import { createMockAnalysisClient } from "../src/ipc/analysis-client";
import { createMockGitClient } from "../src/ipc/git-client";
import type { DiffReviewClient } from "../src/ipc/diff-review-client";
import { ElkLayoutEngine } from "../src/domain/layout";
import { withDiffReview } from "../src/domain/diff";
import type { ModuleRFNode, ProjectedGraph, RFNode } from "../src/domain/graph";

const PASTE = "diff --git a/src/core/store.ts b/src/core/store.ts\n";

function stubReviewClient(seed: string[] = []) {
  const saved: string[][] = [];
  const client: DiffReviewClient = {
    loadDiffReview: async (_root, _diffId, diffPaths) =>
      seed.filter((path) => diffPaths.includes(path)),
    saveDiffReview: async (_root, _diffId, reviewedPaths) => {
      saved.push(reviewedPaths);
    },
  };
  return { client, saved };
}

function storeWith(client: DiffReviewClient): GraphSessionStore {
  return new GraphSessionStore(
    createMockAnalysisClient(),
    createMockGitClient(),
    new ElkLayoutEngine(),
    client,
  );
}

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("GraphSessionStore diff review", () => {
  it("marks a diffed file as reviewed and persists the set", async () => {
    const { client, saved } = stubReviewClient();
    const store = storeWith(client);
    await store.loadProject("/repo");
    await store.applyDiffFromPaste(PASTE);
    expect(store.getDiffReviewedIds().size).toBe(0);

    store.toggleDiffReviewed("src/core/store.ts");
    expect(store.getDiffReviewedIds().has("src/core/store.ts")).toBe(true);
    await flushMicrotasks();
    expect(saved.at(-1)).toEqual(["src/core/store.ts"]);

    store.toggleDiffReviewed("src/core/store.ts");
    expect(store.getDiffReviewedIds().size).toBe(0);
    await flushMicrotasks();
    expect(saved.at(-1)).toEqual([]);
  });

  it("restores persisted marks when the same diff is applied again", async () => {
    const { client } = stubReviewClient(["src/core/store.ts"]);
    const store = storeWith(client);
    await store.loadProject("/repo");
    await store.applyDiffFromPaste(PASTE);
    expect(store.getDiffReviewedIds().has("src/core/store.ts")).toBe(true);

    store.clearDiffOverlay();
    expect(store.getDiffReviewedIds().size).toBe(0);

    await store.applyDiffFromPaste(PASTE);
    expect(store.getDiffReviewedIds().has("src/core/store.ts")).toBe(true);
  });

  it("drops persisted marks for files no longer in the diff", async () => {
    const { client } = stubReviewClient(["src/core/store.ts", "src/gone.ts"]);
    const store = storeWith(client);
    await store.loadProject("/repo");
    await store.applyDiffFromPaste(PASTE);
    expect([...store.getDiffReviewedIds()]).toEqual(["src/core/store.ts"]);
  });

  it("replaces the reviewed set immutably so memos invalidate", async () => {
    const { client } = stubReviewClient();
    const store = storeWith(client);
    await store.loadProject("/repo");
    await store.applyDiffFromPaste(PASTE);
    const before = store.getDiffReviewedIds();
    store.toggleDiffReviewed("src/core/store.ts");
    expect(store.getDiffReviewedIds()).not.toBe(before);
  });

  it("toggle without an active diff is a no-op", async () => {
    const { client, saved } = stubReviewClient();
    const store = storeWith(client);
    await store.loadProject("/repo");
    store.toggleDiffReviewed("src/core/store.ts");
    expect(store.getDiffReviewedIds().size).toBe(0);
    await flushMicrotasks();
    expect(saved.length).toBe(0);
  });

  it("surfaces a load failure without breaking the diff overlay", async () => {
    const client: DiffReviewClient = {
      loadDiffReview: async () => {
        throw new Error("corrupt");
      },
      saveDiffReview: async () => {},
    };
    const store = storeWith(client);
    await store.loadProject("/repo");
    await store.applyDiffFromPaste(PASTE);
    expect(store.getDiffOverlay()).not.toBeNull();
    expect(store.getDiffReviewError()).toBe("corrupt");
    expect(store.getDiffReviewedIds().size).toBe(0);
  });
});

describe("withDiffReview", () => {
  const moduleNode = (id: string): ModuleRFNode =>
    ({
      id,
      type: "module",
      position: { x: 0, y: 0 },
      data: { label: id, isFacade: false, language: "typescript", diffState: "affected" },
    }) as unknown as ModuleRFNode;

  const groupNode = (id: string): RFNode =>
    ({
      id,
      type: "group",
      position: { x: 0, y: 0 },
      data: { label: id, color: "#000" },
    }) as unknown as RFNode;

  it("stamps diffReviewed on reviewed module nodes only", () => {
    const projected: ProjectedGraph = {
      nodes: [moduleNode("a"), groupNode("g")],
      edges: [],
    };
    const stamped = withDiffReview(projected, new Set(["a"]));
    expect(stamped.nodes[0]!.data.diffReviewed).toBe(true);
    expect(stamped.nodes[1]!.data.diffReviewed).toBeUndefined();
  });

  it("returns the same projection when nothing is reviewed", () => {
    const projected: ProjectedGraph = { nodes: [moduleNode("a")], edges: [] };
    expect(withDiffReview(projected, new Set())).toBe(projected);
  });
});
