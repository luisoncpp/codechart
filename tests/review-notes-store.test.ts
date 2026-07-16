import { describe, expect, it, vi } from "vitest";
import graphJson from "./fixtures/golden/project-graph.json";
import { ReviewNotesStore } from "../src/state/review-notes";
import type { ProjectGraph } from "../src/domain/graph";
import type { ReviewNotesClient, ReviewNotesDocument } from "../src/ipc/review-notes-client";

const graph = graphJson as unknown as ProjectGraph;

function client(overrides?: Partial<ReviewNotesClient>): ReviewNotesClient {
  return {
    loadReviewNotes: async () => ({ version: 1, notes: [] }),
    saveReviewNotes: async () => undefined,
    ...overrides,
  };
}

async function ready(store: ReviewNotesStore) {
  await store.loadProject({ root: "/project", graph });
}

describe("ReviewNotesStore", () => {
  it("loads a project and ignores a stale load", async () => {
    let resolveFirst!: (value: ReviewNotesDocument) => void;
    const first = new Promise<ReviewNotesDocument>((resolve) => { resolveFirst = resolve; });
    const store = new ReviewNotesStore(client({ loadReviewNotes: vi.fn().mockReturnValueOnce(first).mockResolvedValueOnce({ version: 1, notes: [] }) }));
    const loading = store.loadProject({ root: "/first", graph });
    await store.loadProject({ root: "/second", graph });
    resolveFirst({ version: 1, notes: [{ id: "stale", path: "src/main.ts", startLine: 1, endLine: 1, anchorLines: ["x"], body: "stale" }] });
    await loading;
    expect(store.getDocument().notes).toEqual([]);
    expect(store.getPhase()).toBe("ready");
  });

  it("serializes immediate saves and debounces valid edits", async () => {
    vi.useFakeTimers();
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => { release = resolve; });
    const save = vi.fn().mockReturnValueOnce(blocked).mockResolvedValue(undefined);
    const store = new ReviewNotesStore(client({ saveReviewNotes: save }));
    await ready(store);
    store.beginDraft({ path: "src/main.ts", startLine: 1, endLine: 1, anchorLines: ["x"] });
    store.confirmDraft("first");
    store.editBody(store.getDocument().notes[0]!.id, "edited");
    await vi.advanceTimersByTimeAsync(400);
    expect(save).toHaveBeenCalledTimes(1);
    release();
    await Promise.resolve();
    await Promise.resolve();
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1]![1].notes[0]!.body).toBe("edited");
    vi.useRealTimers();
  });

  it("rejects blank drafts and preserves Done Undo order", async () => {
    vi.useFakeTimers();
    const store = new ReviewNotesStore(client());
    await ready(store);
    store.beginDraft({ path: "src/main.ts", startLine: 1, endLine: 1, anchorLines: ["x"] });
    store.confirmDraft("");
    expect(store.getValidation()).toContain("required");
    store.confirmDraft("one");
    store.beginDraft({ path: "src/main.ts", startLine: 2, endLine: 2, anchorLines: ["y"] });
    store.confirmDraft("two");
    const first = store.getDocument().notes[0]!.id;
    store.done(first);
    expect(store.getDocument().notes.map((note) => note.body)).toEqual(["two"]);
    store.undoDone();
    expect(store.getDocument().notes.map((note) => note.body)).toEqual(["one", "two"]);
    vi.useRealTimers();
  });

  it("resolves multiple notes atomically and restores them with one Undo", async () => {
    vi.useFakeTimers();
    const document = { version: 1 as const, notes: [
      { id: "a", path: "src/main.ts", startLine: 1, endLine: 1, anchorLines: ["a"], body: "one" },
      { id: "b", path: "src/main.ts", startLine: 2, endLine: 2, anchorLines: ["b"], body: "two" },
      { id: "c", path: "src/main.ts", startLine: 3, endLine: 3, anchorLines: ["c"], body: "three" },
    ] };
    const store = new ReviewNotesStore(client({ loadReviewNotes: async () => document }));
    await ready(store);

    store.doneAll(["a", "c"]);
    expect(store.getDocument().notes.map((note) => note.id)).toEqual(["b"]);
    expect(store.canUndo()).toBe(true);

    store.undoDone();
    expect(store.getDocument().notes.map((note) => note.id)).toEqual(["a", "b", "c"]);
    vi.useRealTimers();
  });

  it("derives module/group counts, filters, and navigation", async () => {
    const document = { version: 1 as const, notes: [
      { id: "a", path: "src/core/index.ts", startLine: 1, endLine: 1, anchorLines: ["x"], body: "a" },
      { id: "b", path: "src/core/store.ts", startLine: 2, endLine: 2, anchorLines: ["y"], body: "b" },
    ] };
    const store = new ReviewNotesStore(client({ loadReviewNotes: async () => document }));
    await ready(store);
    expect(store.countForModule("src/core/index.ts")).toBe(1);
    expect(store.countForGroup("core")).toBe(2);
    store.filterModule("src/core/index.ts");
    expect(store.filteredNotes().map((note) => note.id)).toEqual(["a"]);
    store.navigate(document.notes[1]!);
    expect(store.getNavigationRequest()).toMatchObject({ path: "src/core/store.ts", startLine: 2 });
  });

  it("consumes navigation once and clears stale requests on project load", async () => {
    const note = { id: "a", path: "src/main.ts", startLine: 1, endLine: 1, anchorLines: ["x"], body: "a" };
    const store = new ReviewNotesStore(client());
    await ready(store);
    store.navigate(note);
    const request = store.getNavigationRequest()!;

    expect(store.consumeNavigationRequest(request.seq)).toBe(true);
    expect(store.consumeNavigationRequest(request.seq)).toBe(false);
    expect(store.getNavigationRequest()).toBeNull();

    store.navigate(note);
    await store.loadProject({ root: "/next", graph });
    expect(store.getNavigationRequest()).toBeNull();
  });
});
