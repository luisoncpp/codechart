import { describe, expect, it } from "vitest";
import { stepIndex } from "../src/features/graph_canvas/Private/highlight/match-stepper";

describe("stepIndex", () => {
  it("steps forward from the not-yet-navigated state to the first match", () => {
    expect(stepIndex(-1, 1, 5)).toBe(0);
  });

  it("steps backward from the not-yet-navigated state to the last match", () => {
    expect(stepIndex(-1, -1, 5)).toBe(4);
  });

  it("wraps forward past the last match", () => {
    expect(stepIndex(4, 1, 5)).toBe(0);
  });

  it("wraps backward past the first match", () => {
    expect(stepIndex(0, -1, 5)).toBe(4);
  });

  it("steps normally in the middle", () => {
    expect(stepIndex(2, 1, 5)).toBe(3);
    expect(stepIndex(2, -1, 5)).toBe(1);
  });

  it("stays at the not-yet-navigated state when there are no matches", () => {
    expect(stepIndex(-1, 1, 0)).toBe(-1);
    expect(stepIndex(3, 1, 0)).toBe(-1);
  });
});
