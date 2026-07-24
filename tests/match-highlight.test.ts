import { describe, expect, it } from "vitest";
import {
  segmentTokenText,
  type LineMatchRange,
} from "../src/features/graph_canvas/Private/highlight/match-highlight";

function range(startCol: number, endCol: number, active = false): LineMatchRange {
  return { startCol, endCol, active };
}

describe("segmentTokenText", () => {
  it("returns a single unmarked segment when no range overlaps", () => {
    expect(segmentTokenText("const", 0, [range(10, 13)])).toEqual([{ text: "const" }]);
  });

  it("marks a match fully inside the token", () => {
    expect(segmentTokenText("username", 0, [range(4, 8)])).toEqual([
      { text: "user" },
      { text: "name", match: "match" },
    ]);
  });

  it("marks a match covering the whole token", () => {
    expect(segmentTokenText("foo", 5, [range(5, 8)])).toEqual([
      { text: "foo", match: "match" },
    ]);
  });

  it("splits a match spanning two tokens into a marked tail and head", () => {
    // line "foobar" tokenized as "foo" + "bar", match on "obar" (cols 2..6)
    expect(segmentTokenText("foo", 0, [range(2, 6)])).toEqual([
      { text: "fo" },
      { text: "o", match: "match" },
    ]);
    expect(segmentTokenText("bar", 3, [range(2, 6)])).toEqual([
      { text: "bar", match: "match" },
    ]);
  });

  it("handles several ranges in one token and propagates the active flag", () => {
    expect(segmentTokenText("aXbXc", 0, [range(1, 2, /*active=*/true), range(3, 4)])).toEqual([
      { text: "a" },
      { text: "X", match: "active" },
      { text: "b" },
      { text: "X", match: "match" },
      { text: "c" },
    ]);
  });
});
