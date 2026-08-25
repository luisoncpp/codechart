import { describe, expect, it } from "vitest";
import {
  buildModuleDiffDisplay,
  detectMovedLines,
  lineDiffsFromUnified,
  type FileLineDiff,
} from "../src/domain/diff";

describe("detectMovedLines", () => {
  it("detects a contiguous block moved from one file to another", () => {
    const diffA: FileLineDiff = {
      addedLineNumbers: new Set(),
      addedLineTexts: new Map(),
      removedLineNumbers: new Set([10, 11, 12]),
      removedLineDetails: [
        { oldLine: 10, text: "export function helper() {" },
        { oldLine: 11, text: "  return 42;" },
        { oldLine: 12, text: "}" },
      ],
      removeBeforeLine: new Map([[1, ["export function helper() {", "  return 42;", "}"]]]),
    };

    const diffB: FileLineDiff = {
      addedLineNumbers: new Set([1, 2, 3]),
      addedLineTexts: new Map([
        [1, "export function helper() {"],
        [2, "  return 42;"],
        [3, "}"],
      ]),
      removedLineNumbers: new Set(),
      removedLineDetails: [],
      removeBeforeLine: new Map(),
    };

    const input = new Map([
      ["src/a.ts", diffA],
      ["src/b.ts", diffB],
    ]);

    const result = detectMovedLines(input);
    const resA = result.get("src/a.ts")!;
    const resB = result.get("src/b.ts")!;

    expect(resA.movedRemovedLines?.get(10)).toEqual({ path: "src/b.ts", line: 1 });
    expect(resA.movedRemovedLines?.get(11)).toEqual({ path: "src/b.ts", line: 2 });
    expect(resA.movedRemovedLines?.get(12)).toEqual({ path: "src/b.ts", line: 3 });

    expect(resB.movedAddedLines?.get(1)).toEqual({ path: "src/a.ts", line: 10 });
    expect(resB.movedAddedLines?.get(2)).toEqual({ path: "src/a.ts", line: 11 });
    expect(resB.movedAddedLines?.get(3)).toEqual({ path: "src/a.ts", line: 12 });

    // Verify buildModuleDiffDisplay output
    const rowsA = buildModuleDiffDisplay("", resA);
    expect(rowsA).toEqual([
      { kind: "move-remove", lineNumber: 10, text: "export function helper() {", movedTo: { path: "src/b.ts", line: 1 }, tooltip: "Moved to src/b.ts:1" },
      { kind: "move-remove", lineNumber: 11, text: "  return 42;", movedTo: { path: "src/b.ts", line: 2 }, tooltip: "Moved to src/b.ts:2" },
      { kind: "move-remove", lineNumber: 12, text: "}", movedTo: { path: "src/b.ts", line: 3 }, tooltip: "Moved to src/b.ts:3" },
    ]);

    const rowsB = buildModuleDiffDisplay("export function helper() {\n  return 42;\n}", resB);
    expect(rowsB).toEqual([
      { kind: "move-add", lineNumber: 1, text: "export function helper() {", movedFrom: { path: "src/a.ts", line: 10 }, tooltip: "Moved from src/a.ts:10" },
      { kind: "move-add", lineNumber: 2, text: "  return 42;", movedFrom: { path: "src/a.ts", line: 11 }, tooltip: "Moved from src/a.ts:11" },
      { kind: "move-add", lineNumber: 3, text: "}", movedFrom: { path: "src/a.ts", line: 12 }, tooltip: "Moved from src/a.ts:12" },
    ]);
  });

  it("detects lines moved from multiple parts/files to a single destination", () => {
    const diffA: FileLineDiff = {
      addedLineNumbers: new Set(),
      addedLineTexts: new Map(),
      removedLineNumbers: new Set([5, 6]),
      removedLineDetails: [
        { oldLine: 5, text: "const PART_A = 100;" },
        { oldLine: 6, text: "export function getPartA() { return PART_A; }" },
      ],
      removeBeforeLine: new Map([[1, ["const PART_A = 100;", "export function getPartA() { return PART_A; }"]]]),
    };

    const diffB: FileLineDiff = {
      addedLineNumbers: new Set(),
      addedLineTexts: new Map(),
      removedLineNumbers: new Set([15, 16]),
      removedLineDetails: [
        { oldLine: 15, text: "const PART_B = 200;" },
        { oldLine: 16, text: "export function getPartB() { return PART_B; }" },
      ],
      removeBeforeLine: new Map([[1, ["const PART_B = 200;", "export function getPartB() { return PART_B; }"]]]),
    };

    const diffDest: FileLineDiff = {
      addedLineNumbers: new Set([1, 2, 3, 4]),
      addedLineTexts: new Map([
        [1, "const PART_A = 100;"],
        [2, "export function getPartA() { return PART_A; }"],
        [3, "const PART_B = 200;"],
        [4, "export function getPartB() { return PART_B; }"],
      ]),
      removedLineNumbers: new Set(),
      removedLineDetails: [],
      removeBeforeLine: new Map(),
    };

    const result = detectMovedLines(new Map([
      ["src/a.ts", diffA],
      ["src/b.ts", diffB],
      ["src/dest.ts", diffDest],
    ]));

    const resDest = result.get("src/dest.ts")!;
    expect(resDest.movedAddedLines?.get(1)).toEqual({ path: "src/a.ts", line: 5 });
    expect(resDest.movedAddedLines?.get(2)).toEqual({ path: "src/a.ts", line: 6 });
    expect(resDest.movedAddedLines?.get(3)).toEqual({ path: "src/b.ts", line: 15 });
    expect(resDest.movedAddedLines?.get(4)).toEqual({ path: "src/b.ts", line: 16 });

    expect(result.get("src/a.ts")!.movedRemovedLines?.get(5)).toEqual({ path: "src/dest.ts", line: 1 });
    expect(result.get("src/b.ts")!.movedRemovedLines?.get(15)).toEqual({ path: "src/dest.ts", line: 3 });
  });

  it("does not match trivial delimiters across unrelated files", () => {
    const diffA: FileLineDiff = {
      addedLineNumbers: new Set(),
      addedLineTexts: new Map(),
      removedLineNumbers: new Set([1, 2]),
      removedLineDetails: [
        { oldLine: 1, text: "{" },
        { oldLine: 2, text: "}" },
      ],
      removeBeforeLine: new Map([[1, ["{", "}"]]]),
    };

    const diffB: FileLineDiff = {
      addedLineNumbers: new Set([10, 11]),
      addedLineTexts: new Map([
        [10, "{"],
        [11, "}"],
      ]),
      removedLineNumbers: new Set(),
      removedLineDetails: [],
      removeBeforeLine: new Map(),
    };

    const result = detectMovedLines(new Map([
      ["src/a.ts", diffA],
      ["src/b.ts", diffB],
    ]));

    expect(result.get("src/a.ts")!.movedRemovedLines).toBeUndefined();
    expect(result.get("src/b.ts")!.movedAddedLines).toBeUndefined();
  });

  it("detects moved lines in unified diff parsing", () => {
    const text = [
      "diff --git a/src/source.ts b/src/source.ts",
      "--- a/src/source.ts",
      "+++ b/src/source.ts",
      "@@ -10,4 +10,1 @@",
      " context line",
      "-export const MOVED_CONFIG = {",
      "-  timeout: 5000,",
      "-};",
      " context line 2",
      "diff --git a/src/target.ts b/src/target.ts",
      "--- a/src/target.ts",
      "+++ b/src/target.ts",
      "@@ -20,1 +20,4 @@",
      " header line",
      "+export const MOVED_CONFIG = {",
      "+  timeout: 5000,",
      "+};",
      " footer line",
    ].join("\n");

    const diffMap = lineDiffsFromUnified(text);
    const sourceDiff = diffMap.get("src/source.ts")!;
    const targetDiff = diffMap.get("src/target.ts")!;

    expect(sourceDiff.movedRemovedLines?.get(11)).toEqual({ path: "src/target.ts", line: 21 });
    expect(sourceDiff.movedRemovedLines?.get(12)).toEqual({ path: "src/target.ts", line: 22 });
    expect(sourceDiff.movedRemovedLines?.get(13)).toEqual({ path: "src/target.ts", line: 23 });

    expect(targetDiff.movedAddedLines?.get(21)).toEqual({ path: "src/source.ts", line: 11 });
    expect(targetDiff.movedAddedLines?.get(22)).toEqual({ path: "src/source.ts", line: 12 });
    expect(targetDiff.movedAddedLines?.get(23)).toEqual({ path: "src/source.ts", line: 13 });
  });

  it("detects single significant line moves", () => {
    const diffA: FileLineDiff = {
      addedLineNumbers: new Set(),
      addedLineTexts: new Map(),
      removedLineNumbers: new Set([7]),
      removedLineDetails: [{ oldLine: 7, text: "export const MAX_RETRY_COUNT = 3;" }],
      removeBeforeLine: new Map([[1, ["export const MAX_RETRY_COUNT = 3;"]]]),
    };

    const diffB: FileLineDiff = {
      addedLineNumbers: new Set([42]),
      addedLineTexts: new Map([[42, "export const MAX_RETRY_COUNT = 3;"]]),
      removedLineNumbers: new Set(),
      removedLineDetails: [],
      removeBeforeLine: new Map(),
    };

    const result = detectMovedLines(new Map([
      ["src/config.ts", diffA],
      ["src/constants.ts", diffB],
    ]));

    expect(result.get("src/config.ts")!.movedRemovedLines?.get(7)).toEqual({
      path: "src/constants.ts",
      line: 42,
    });
    expect(result.get("src/constants.ts")!.movedAddedLines?.get(42)).toEqual({
      path: "src/config.ts",
      line: 7,
    });
  });
});
