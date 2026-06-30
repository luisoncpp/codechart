import { describe, expect, it } from "vitest";
import { moduleCenter } from "../src/features/graph_canvas/Private/module-center";

describe("moduleCenter", () => {
  it("returns the absolute center of a nested module node", () => {
    const internal = {
      width: 100,
      height: 40,
      measured: { width: 0, height: 0 },
      internals: { positionAbsolute: { x: 250, y: 180 } },
    };
    expect(moduleCenter(internal as never)).toEqual({ x: 300, y: 200 });
  });

  it("returns null when the node is missing or not measured yet", () => {
    expect(moduleCenter(undefined)).toBeNull();
    expect(
      moduleCenter({
        width: 0,
        height: 0,
        measured: { width: 0, height: 0 },
        internals: { positionAbsolute: { x: 0, y: 0 } },
      } as never),
    ).toBeNull();
  });
});
