import { describe, expect, it } from "vitest";
import { symbolsFitOnScreen } from "../src/domain/layout";

describe("symbolsFitOnScreen", () => {
  it("returns false when font or card is too small on screen", () => {
    expect(symbolsFitOnScreen(120, 90, 0.9)).toBe(false);
    expect(symbolsFitOnScreen(800, 600, 1.1)).toBe(false);
  });

  it("returns true when font and card meet screen thresholds", () => {
    expect(symbolsFitOnScreen(120, 90, 1.6)).toBe(true);
    expect(symbolsFitOnScreen(120, 90, 2)).toBe(true);
  });

  it("returns false for non-finite or non-positive zoom", () => {
    expect(symbolsFitOnScreen(120, 90, NaN)).toBe(false);
    expect(symbolsFitOnScreen(120, 90, 0)).toBe(false);
    expect(symbolsFitOnScreen(120, 90, -1)).toBe(false);
  });
});
