import { describe, expect, it } from "vitest";
import {
  changeBlockStarts,
  hasLineChanges,
  pickChangeBlock,
} from "../src/features/graph_canvas/Private/preview_frames/change-blocks";

describe("changeBlockStarts", () => {
  it("returns the first row of each run of changed rows", () => {
    const kinds = ["context", "remove", "add", "context", "context", "move-add", "context", "add"];
    expect(changeBlockStarts(kinds)).toEqual([1, 5, 7]);
  });

  it("treats a change on the first row as a block start", () => {
    expect(changeBlockStarts(["add", "add", "context"])).toEqual([0]);
  });

  it("returns nothing for an unchanged file", () => {
    expect(changeBlockStarts(["context", "context"])).toEqual([]);
  });
});

describe("pickChangeBlock", () => {
  const mids = [10, 200, 400];

  it("steps to the first block below the view center", () => {
    expect(pickChangeBlock({ mids, viewCenter: 100, delta: 1, current: null })).toBe(1);
  });

  it("steps to the last block above the view center", () => {
    expect(pickChangeBlock({ mids, viewCenter: 300, delta: -1, current: null })).toBe(1);
  });

  it("skips the block already centered", () => {
    expect(pickChangeBlock({ mids, viewCenter: 200, delta: 1, current: null })).toBe(2);
    expect(pickChangeBlock({ mids, viewCenter: 200, delta: -1, current: null })).toBe(0);
  });

  it("wraps around past either end", () => {
    expect(pickChangeBlock({ mids, viewCenter: 500, delta: 1, current: null })).toBe(0);
    expect(pickChangeBlock({ mids, viewCenter: 5, delta: -1, current: null })).toBe(2);
  });

  it("steps from the previous index when the body did not scroll", () => {
    // Block 0 sits above center because the body cannot scroll above the top.
    expect(pickChangeBlock({ mids, viewCenter: 100, delta: -1, current: 0 })).toBe(2);
    expect(pickChangeBlock({ mids, viewCenter: 100, delta: 1, current: 0 })).toBe(1);
  });

  it("returns -1 without blocks", () => {
    expect(pickChangeBlock({ mids: [], viewCenter: 0, delta: 1, current: null })).toBe(-1);
  });
});

describe("hasLineChanges", () => {
  it("is true for added or removed rows only", () => {
    const empty = { addedLineNumbers: new Set<number>(), removeBeforeLine: new Map() };
    expect(hasLineChanges(undefined)).toBe(false);
    expect(hasLineChanges(empty)).toBe(false);
    expect(hasLineChanges({ ...empty, addedLineNumbers: new Set([3]) })).toBe(true);
    expect(hasLineChanges({ ...empty, removeBeforeLine: new Map([[2, ["x"]]]) })).toBe(true);
  });
});
