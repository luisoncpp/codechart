import { describe, expect, it } from "vitest";
import {
  buildModuleDiffDisplay,
  lineDiffsFromUnified,
} from "../src/domain/diff";

describe("lineDiffsFromUnified", () => {
  it("records added and removed lines per file", () => {
    const text = [
      "diff --git a/src/a.ts b/src/a.ts",
      "--- a/src/a.ts",
      "+++ b/src/a.ts",
      "@@ -1,3 +1,3 @@",
      " keep",
      "-old",
      "+new",
    ].join("\n");

    const map = lineDiffsFromUnified(text);
    const file = map.get("src/a.ts");
    expect(file?.addedLineNumbers.has(2)).toBe(true);
    expect(file?.removedLineNumbers?.has(2)).toBe(true);
    expect(file?.removeBeforeLine.get(2)).toEqual(["old"]);
  });
});

describe("buildModuleDiffDisplay", () => {
  it("inserts red removed rows and marks added lines", () => {
    const rows = buildModuleDiffDisplay("keep\nnew\n", {
      addedLineNumbers: new Set([2]),
      removeBeforeLine: new Map([[2, ["old"]]]),
    });
    expect(rows[0]).toMatchObject({ kind: "context", lineNumber: 1, text: "keep" });
    expect(rows[1]).toMatchObject({ kind: "remove", text: "old" });
    expect(rows[2]).toMatchObject({ kind: "add", lineNumber: 2, text: "new" });
  });

  it("renders a fully deleted file as only red rows", () => {
    const text = [
      "diff --git a/src/gone.ts b/src/gone.ts",
      "deleted file mode 100644",
      "--- a/src/gone.ts",
      "+++ /dev/null",
      "@@ -1,2 +0,0 @@",
      "-line 1",
      "-line 2",
    ].join("\n");
    const file = lineDiffsFromUnified(text).get("src/gone.ts");
    const rows = buildModuleDiffDisplay("", file);
    expect(rows).toEqual([
      { kind: "remove", lineNumber: 1, text: "line 1" },
      { kind: "remove", lineNumber: 2, text: "line 2" },
    ]);
  });
});
