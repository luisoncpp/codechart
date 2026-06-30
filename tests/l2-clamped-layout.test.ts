import { describe, expect, it } from "vitest";
import {
  calculateVisibleBounds,
  groupDocBorderInset,
  moduleL2BorderInset,
} from "../src/features/graph_canvas/Private/use-l2-clamped-layout";

describe("calculateVisibleBounds", () => {
  it("returns null when the node is fully outside the viewport", () => {
    const node = {
      getBoundingClientRect: () => ({ top: 200, bottom: 300, left: 0, right: 100 }),
    } as HTMLDivElement;
    const parent = {
      getBoundingClientRect: () => ({ top: 0, left: 0, width: 800, height: 150 }),
    } as Element;

    expect(calculateVisibleBounds(node, parent, /*zoom=*/1)).toBeNull();
  });

  it("clips to the visible intersection when partially on screen", () => {
    const node = {
      getBoundingClientRect: () => ({ top: -40, bottom: 260, left: -20, right: 180 }),
    } as HTMLDivElement;
    const parent = {
      getBoundingClientRect: () => ({ top: 0, left: 0, width: 800, height: 200 }),
    } as Element;

    const bounds = calculateVisibleBounds(node, parent, /*zoom=*/2, /*borderInset=*/4);
    expect(bounds).toEqual({
      top: 18,
      height: 100,
      left: 8,
      width: 88,
    });
  });

  it("insets fully visible nodes so sticky children stay inside the border box", () => {
    const node = {
      getBoundingClientRect: () => ({ top: 50, bottom: 250, left: 100, right: 300 }),
    } as HTMLDivElement;
    const parent = {
      getBoundingClientRect: () => ({ top: 0, left: 0, width: 800, height: 600 }),
    } as Element;

    const bounds = calculateVisibleBounds(
      node,
      parent,
      /*zoom=*/2,
      groupDocBorderInset(/*zoom=*/2),
    );
    expect(bounds).toEqual({ top: 0, height: 97, left: 0, width: 97 });
  });

  it("uses screen px for module borders (node px * zoom)", () => {
    expect(moduleL2BorderInset(/*zoom=*/2)).toBe(4);
    expect(groupDocBorderInset(/*zoom=*/2)).toBe(3);
  });
});
