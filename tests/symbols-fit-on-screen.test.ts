import { describe, expect, it } from "vitest";
import { symbolsFitOnScreen } from "../src/domain/layout";

describe("symbolsFitOnScreen", () => {
  it("returns false when the card is too small on screen", () => {
    expect(symbolsFitOnScreen(120, 90, 0.9)).toBe(false);
    expect(symbolsFitOnScreen(60, 40, 1.4)).toBe(false);
  });

  it("paints large cards across L1.5, not only after 9px labels reach 12px on screen", () => {
    expect(symbolsFitOnScreen(800, 600, 0.9)).toBe(true);
    expect(symbolsFitOnScreen(800, 600, 1.1)).toBe(true);
    expect(symbolsFitOnScreen(200, 160, 0.9)).toBe(true);
  });

  it("returns true when compact cards meet the screen-size floor", () => {
    expect(symbolsFitOnScreen(120, 90, 1.12)).toBe(true);
    expect(symbolsFitOnScreen(120, 90, 1.35)).toBe(true);
    expect(symbolsFitOnScreen(132, 99, 1.35)).toBe(true);
    expect(symbolsFitOnScreen(120, 90, 1.6)).toBe(true);
    expect(symbolsFitOnScreen(120, 90, 2)).toBe(true);
  });

  it("returns false for non-finite or non-positive zoom", () => {
    expect(symbolsFitOnScreen(120, 90, NaN)).toBe(false);
    expect(symbolsFitOnScreen(120, 90, 0)).toBe(false);
    expect(symbolsFitOnScreen(120, 90, -1)).toBe(false);
  });
});
