import { describe, expect, it } from "vitest";
import {
  codeMatchesByLine,
  descriptionRanges,
  findFrameMatches,
  matchCounter,
} from "../src/features/graph_canvas/Private/preview_frames/frame-search";

const SOURCE = "const foo = 1;\nfoo(foo);\nreturn FOO;";

describe("findFrameMatches", () => {
  it("returns no matches for an empty query", () => {
    expect(findFrameMatches({ sourceText: SOURCE, query: "" })).toEqual([]);
  });

  it("finds every occurrence, several per line, case-insensitively", () => {
    const matches = findFrameMatches({ sourceText: SOURCE, query: "foo" });
    expect(matches).toEqual([
      { region: "code", line: 1, startCol: 6, endCol: 9 },
      { region: "code", line: 2, startCol: 0, endCol: 3 },
      { region: "code", line: 2, startCol: 4, endCol: 7 },
      { region: "code", line: 3, startCol: 7, endCol: 10 },
    ]);
  });

  it("finds non-overlapping matches only", () => {
    const matches = findFrameMatches({ sourceText: "aaa", query: "aa" });
    expect(matches).toEqual([{ region: "code", line: 1, startCol: 0, endCol: 2 }]);
  });

  it("puts description matches before code matches", () => {
    const matches = findFrameMatches({
      description: "The foo module",
      sourceText: SOURCE,
      query: "foo",
    });
    expect(matches[0]).toEqual({ region: "description", line: 0, startCol: 4, endCol: 7 });
    expect(matches).toHaveLength(5);
  });
});

describe("codeMatchesByLine", () => {
  it("groups by line and flags only the active match", () => {
    const matches = findFrameMatches({ sourceText: SOURCE, query: "foo" });
    const byLine = codeMatchesByLine(matches, /*activeIndex=*/2);
    expect(byLine.get(1)).toEqual([{ startCol: 6, endCol: 9, active: false }]);
    expect(byLine.get(2)).toEqual([
      { startCol: 0, endCol: 3, active: false },
      { startCol: 4, endCol: 7, active: true },
    ]);
  });

  it("skips description matches", () => {
    const matches = findFrameMatches({ description: "foo", sourceText: "bar", query: "foo" });
    expect(codeMatchesByLine(matches, 0).size).toBe(0);
  });
});

describe("descriptionRanges", () => {
  it("returns only description ranges with the active flag", () => {
    const matches = findFrameMatches({ description: "foo foo", sourceText: "foo", query: "foo" });
    expect(descriptionRanges(matches, /*activeIndex=*/0)).toEqual([
      { startCol: 0, endCol: 3, active: true },
      { startCol: 4, endCol: 7, active: false },
    ]);
  });
});

describe("matchCounter", () => {
  it("reports position and no-results states", () => {
    expect(matchCounter(0, 3)).toBe("1 of 3");
    expect(matchCounter(2, 3)).toBe("3 of 3");
    expect(matchCounter(0, 0)).toBe("No results");
  });
});
