import { describe, expect, it } from "vitest";
import { createMemoryReviewStackClient } from "../src/ipc/review-stack-client";
import { ReviewStackStore } from "../src/state/review-stack";
import { renderStackMarkdown } from "../src/features/review_stack/Private/StackMarkdown";

const SPLIT_COHORTS = [
  {
    id: "c1",
    title: "Model",
    rationale: "**Foundation**",
    explanation: "## Why\nThe model needs an owner.",
    dependsOn: [],
    moduleIds: [],
    hunks: [{ path: "src/a.ts", side: "after" as const, startLine: 1, endLine: 4 }],
  },
  {
    id: "c2",
    title: "Wiring",
    rationale: "Uses it",
    dependsOn: ["c1"],
    moduleIds: ["src/new.ts"],
    hunks: [
      { path: "src/a.ts", side: "after" as const, startLine: 20, endLine: 30 },
      { path: "src/b.ts", side: "before" as const, startLine: 2, endLine: 3 },
    ],
  },
];

async function activeStore() {
  const store = new ReviewStackStore(createMemoryReviewStackClient());
  await store.activateDiff("/repo", "commits:a..b");
  await store.setStack({ title: "T", summary: "", cohorts: SPLIT_COHORTS, blockers: [] });
  return store;
}

describe("Review Stack hunk cohorts", () => {
  it("spotlights every file a cohort touches, and one file can sit in two cohorts", async () => {
    const store = await activeStore();
    store.focusCohort("c2");
    expect([...(store.getSpotlightModuleIds() ?? [])]).toEqual(["src/new.ts", "src/a.ts", "src/b.ts"]);
    expect(store.activeCohortRangesFor("src/a.ts")).toEqual([SPLIT_COHORTS[1]!.hunks[0]]);

    store.focusCohort("c1");
    expect(store.activeCohortRangesFor("src/a.ts")).toEqual(SPLIT_COHORTS[0]!.hunks);
    expect(store.activeCohortRangesFor("src/b.ts")).toEqual([]);

    store.focusCohort(null);
    expect(store.activeCohortRangesFor("src/a.ts")).toEqual([]);
  });

  it("issues a one-shot explanation request only for cohorts that have one", async () => {
    const store = await activeStore();
    expect(store.requestExplanation("c2")).toBe(false);
    expect(store.getExplanationRequest()).toBeNull();

    expect(store.requestExplanation("c1")).toBe(true);
    const request = store.getExplanationRequest();
    expect(request).toMatchObject({ cohortId: "c1", title: "Model", markdown: "## Why\nThe model needs an owner." });

    store.consumeExplanation(request!.seq);
    expect(store.getExplanationRequest()).toBeNull();
  });
});

describe("agent Diff Notes", () => {
  it("upserts by id, persists per diff, and survives a stack re-plan", async () => {
    const client = createMemoryReviewStackClient();
    const store = new ReviewStackStore(client);
    await store.activateDiff("/repo", "commits:a..b");
    const note = { id: "n1", path: "src/a.ts", side: "after" as const, startLine: 2, endLine: 3, body: "Why" };

    await store.upsertDiffNotes([note]);
    await store.upsertDiffNotes([{ ...note, body: "Why, revised" }, { ...note, id: "n2", path: "src/b.ts" }]);
    expect(store.diffNotesFor("src/a.ts").map((n) => n.body)).toEqual(["Why, revised"]);

    await store.setStack({ title: "T", summary: "", cohorts: SPLIT_COHORTS, blockers: [] });
    expect(store.getStack()?.diffNotes).toHaveLength(2);

    const reloaded = new ReviewStackStore(client);
    await reloaded.activateDiff("/repo", "commits:a..b");
    expect(reloaded.diffNotesFor("src/b.ts")).toHaveLength(1);
  });
});

describe("renderStackMarkdown", () => {
  it("renders markdown, escapes raw HTML, and never emits a relative href", () => {
    const html = renderStackMarkdown(
      "**bold** `code` <img src=x onerror=alert(1)> [doc](docs/x.md) [site](https://example.com)",
    );
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<code>code</code>");
    expect(html).not.toContain("<img");
    expect(html).not.toContain('href="docs/x.md"');
    expect(html).toContain("doc");
    expect(html).toContain('href="https://example.com" target="_blank"');
  });
});
