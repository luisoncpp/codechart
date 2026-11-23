import { describe, expect, it } from "vitest";
import { createMemoryReviewStackClient } from "../src/ipc/review-stack-client";
import { ReviewStackStore } from "../src/state/review-stack";
import { withReviewStackOverlay, type ProjectedGraph } from "../src/domain/projection";

describe("ReviewStackStore", () => {
  it("persists stacks and findings per diffId and tracks spotlight/blast state", async () => {
    const client = createMemoryReviewStackClient();
    const store = new ReviewStackStore(client);

    await store.activateDiff("/repo", "commits:a..b");
    expect(store.getStack()).toBeNull();

    await store.setStack({
      title: "Add invitations",
      summary: "Model, API, and UI.",
      cohorts: [
        { id: "c1", title: "Model", rationale: "Foundation", dependsOn: [], moduleIds: ["src/a.ts"] },
        { id: "c2", title: "API", rationale: "Endpoints", dependsOn: ["c1"], moduleIds: ["src/b.ts"] },
      ],
      blockers: [],
    });

    await store.upsertFindings([
      {
        id: "f1",
        path: "src/a.ts",
        side: "after",
        startLine: 5,
        endLine: 7,
        severity: "critical",
        category: "security",
        title: "Missing expiry check",
        body: "Check expiresAt",
        layerId: "c1",
        blocker: true,
        status: "open",
      },
    ]);

    expect(store.findingsFor("src/a.ts")).toHaveLength(1);
    store.focusCohort("c1");
    expect([...(store.getSpotlightModuleIds() ?? [])]).toEqual(["src/a.ts"]);

    await store.resolveFinding("f1", "resolved");
    expect(store.getStack()?.findings[0]?.status).toBe("resolved");

    // Re-activating the same diff restores the persisted stack.
    const second = new ReviewStackStore(client);
    await second.activateDiff("/repo", "commits:a..b");
    expect(second.getStack()?.title).toBe("Add invitations");
    expect(second.getStack()?.findings[0]?.status).toBe("resolved");
  });
});

describe("withReviewStackOverlay", () => {
  it("stamps spotlightState and blastDepth onto module nodes only", () => {
    const projected: ProjectedGraph = {
      nodes: [
        {
          id: "g1",
          type: "group",
          position: { x: 0, y: 0 },
          data: { label: "G", color: "#000" },
        },
        {
          id: "src/a.ts",
          type: "module",
          position: { x: 0, y: 0 },
          data: { label: "a.ts", isFacade: false, language: "typescript" },
        },
        {
          id: "src/b.ts",
          type: "module",
          position: { x: 0, y: 0 },
          data: { label: "b.ts", isFacade: false, language: "typescript" },
        },
      ],
      edges: [],
    };

    const stamped = withReviewStackOverlay(projected, {
      spotlightModuleIds: new Set(["src/a.ts"]),
      blastDepths: new Map([["src/b.ts", 2]]),
    });

    const a = stamped.nodes.find((n) => n.id === "src/a.ts");
    const b = stamped.nodes.find((n) => n.id === "src/b.ts");
    expect(a?.type === "module" && a.data.spotlightState).toBe("active");
    expect(b?.type === "module" && b.data.spotlightState).toBe("dimmed");
    expect(b?.type === "module" && b.data.blastDepth).toBe(2);
  });
});
