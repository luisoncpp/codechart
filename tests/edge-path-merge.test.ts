import { describe, expect, it } from "vitest";
import { mergePathD } from "../src/features/graph_canvas/Private/edges/edge-path-merge";

describe("mergePathD", () => {
  it("joins two path strings with a space", () => {
    expect(
      mergePathD([{ path: "M0,0 L10,10" }, { path: "M20,20 L30,30" }]),
    ).toBe("M0,0 L10,10 M20,20 L30,30");
  });

  it("returns empty string for no segments", () => {
    expect(mergePathD([])).toBe("");
  });
});
