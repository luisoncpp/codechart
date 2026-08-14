import { describe, expect, it } from "vitest";
import { computeLineDiff, buildModuleDiffDisplay } from "../src/domain/diff";

describe("computeLineDiff basic", () => {
  it("returns empty diff for identical content", () => {
    const source = "export function test() {\n  return 42;\n}\n";
    const diff = computeLineDiff(source, source);
    expect(diff.addedLineNumbers.size).toBe(0);
    expect(diff.removedLineNumbers?.size).toBe(0);
    expect(diff.removeBeforeLine.size).toBe(0);

    const rows = buildModuleDiffDisplay(source, diff);
    expect(rows.every((row) => row.kind === "context")).toBe(true);
  });

  it("handles empty old source", () => {
    const newSource = "line 1\nline 2";
    const diff = computeLineDiff("", newSource);
    expect(diff.addedLineNumbers).toEqual(new Set([1, 2]));
    expect(diff.removeBeforeLine.size).toBe(0);
  });

  it("handles empty new source", () => {
    const oldSource = "line 1\nline 2";
    const diff = computeLineDiff(oldSource, "");
    expect(diff.addedLineNumbers.size).toBe(0);
    expect(diff.removeBeforeLine.get(1)).toEqual(["line 1", "line 2"]);
  });

  it("normalizes CRLF newlines identically to LF", () => {
    const oldSource = "alpha\r\nbeta\r\ngamma";
    const newSource = "alpha\nbeta-changed\ngamma";
    const diff = computeLineDiff(oldSource, newSource);
    expect(diff.addedLineNumbers).toEqual(new Set([2]));
    expect(diff.removeBeforeLine.get(2)).toEqual(["beta"]);
  });
});

describe("computeLineDiff modifications", () => {
  it("computes diff for renamed file with modifications", () => {
    const oldSource = ["import { alpha } from './alpha';", "", "export function run() {", "  return alpha();", "}"].join("\n");
    const newSource = ["import { beta } from './beta';", "", "export function run() {", "  return beta();", "}"].join("\n");
    const diff = computeLineDiff(oldSource, newSource);
    expect(diff.addedLineNumbers).toEqual(new Set([1, 4]));
    expect(diff.removedLineNumbers).toEqual(new Set([1, 4]));
    expect(diff.removeBeforeLine.get(1)).toEqual(["import { alpha } from './alpha';"]);
    expect(diff.removeBeforeLine.get(4)).toEqual(["  return alpha();"]);

    const rows = buildModuleDiffDisplay(newSource, diff);
    expect(rows).toEqual([
      { kind: "remove", text: "import { alpha } from './alpha';" },
      { kind: "add", lineNumber: 1, text: "import { beta } from './beta';" },
      { kind: "context", lineNumber: 2, text: "" },
      { kind: "context", lineNumber: 3, text: "export function run() {" },
      { kind: "remove", text: "  return alpha();" },
      { kind: "add", lineNumber: 4, text: "  return beta();" },
      { kind: "context", lineNumber: 5, text: "}" },
    ]);
  });

  it("computes diff when lines are appended at the end", () => {
    const diff = computeLineDiff("const a = 1;", "const a = 1;\nconst b = 2;");
    expect(diff.addedLineNumbers).toEqual(new Set([2]));
    expect(diff.removeBeforeLine.size).toBe(0);
  });

  it("computes diff when lines are removed from the end", () => {
    const diff = computeLineDiff("const a = 1;\nconst b = 2;\nconst c = 3;", "const a = 1;");
    expect(diff.addedLineNumbers.size).toBe(0);
    expect(diff.removedLineNumbers).toEqual(new Set([2, 3]));
    expect(diff.removeBeforeLine.get(2)).toEqual(["const b = 2;", "const c = 3;"]);
  });
});
