import { describe, expect, it } from "vitest";
import { lineDiffsFromUnified, realignHunks } from "../src/domain/diff";

const PATH = "Source/Movement.cpp";

// Current (after) file: the function starts at line 9, not where the header claims (line 3).
const SOURCE = [
  "// 1", "// 2", "// 3", "// 4", "// 5", "// 6", "// 7",
  "",
  "bool U::CanAttemptJump() const",
  "{",
  "\tif (!Super::CanAttemptJump())",
  "\t{",
  "\t\treturn false;",
  "\t}",
  "\treturn true;",
  "}",
].join("\n");

const STALE_DIFF = [
  `--- a/${PATH}`,
  `+++ b/${PATH}`,
  "@@ -2,6 +2,9 @@",
  "",
  " bool U::CanAttemptJump() const",
  " {",
  "-\tbool bSuper = Super::CanAttemptJump();",
  "+\tif (!Super::CanAttemptJump())",
  "+\t{",
  "+\t\treturn false;",
  "+\t}",
  "-\treturn bSuper;",
  "+\treturn true;",
  " }",
].join("\n");

describe("realignHunks", () => {
  it("moves a stale hunk header to where its lines match the current file", () => {
    const aligned = realignHunks(STALE_DIFF, new Map([[PATH, SOURCE]]));
    const diff = lineDiffsFromUnified(aligned).get(PATH)!;
    expect([...diff.addedLineNumbers]).toEqual([11, 12, 13, 14, 15]);
    expect(diff.removeBeforeLine.get(11)).toEqual(["\tbool bSuper = Super::CanAttemptJump();"]);
    expect(diff.removeBeforeLine.get(15)).toEqual(["\treturn bSuper;"]);
  });

  it("leaves the diff unchanged when the file source is unknown", () => {
    expect(realignHunks(STALE_DIFF, new Map())).toBe(STALE_DIFF);
  });

  it("leaves the header unchanged when no position matches", () => {
    expect(realignHunks(STALE_DIFF, new Map([[PATH, "unrelated"]]))).toBe(STALE_DIFF);
  });
});
