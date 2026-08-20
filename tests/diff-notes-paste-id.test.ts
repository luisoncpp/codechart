import { describe, expect, it } from "vitest";
import { pasteDiffId } from "../src/state/graph-session/Private/diff-review-id";

describe("pasteDiffId marker stripping", () => {
  it("produces identical hash with and without Diff Note markers", () => {
    const rawPatch = [
      "diff --git a/src/core/store.ts b/src/core/store.ts",
      "--- a/src/core/store.ts",
      "+++ b/src/core/store.ts",
      "@@ -1,3 +1,3 @@",
      " keep",
      "-old",
      "+new",
    ].join("\n");

    const annotatedPatch = [
      "diff --git a/src/core/store.ts b/src/core/store.ts",
      "--- a/src/core/store.ts",
      "+++ b/src/core/store.ts",
      "@@ -1,3 +1,3 @@",
      " keep",
      "-old",
      "# Explaining the change",
      "+new",
      "# Explaining new behavior",
    ].join("\n");

    expect(pasteDiffId(annotatedPatch)).toBe(pasteDiffId(rawPatch));
  });

  it("produces a different hash when a code line changes", () => {
    const patchA = [
      "diff --git a/src/core/store.ts b/src/core/store.ts",
      "--- a/src/core/store.ts",
      "+++ b/src/core/store.ts",
      "@@ -1,2 +1,2 @@",
      "-old",
      "+newA",
    ].join("\n");

    const patchB = [
      "diff --git a/src/core/store.ts b/src/core/store.ts",
      "--- a/src/core/store.ts",
      "+++ b/src/core/store.ts",
      "@@ -1,2 +1,2 @@",
      "-old",
      "+newB",
    ].join("\n");

    expect(pasteDiffId(patchA)).not.toBe(pasteDiffId(patchB));
  });
});
