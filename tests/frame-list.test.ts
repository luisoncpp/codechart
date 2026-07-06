import { describe, expect, it } from "vitest";
import {
  openFrame,
  bringToFront,
  moveFrame,
  type PreviewFrame,
} from "../src/features/graph_canvas/Private/preview_frames/frame-list";

function makeFrame(id: number, moduleId: string, symbolName: string): PreviewFrame {
  return {
    id,
    moduleId,
    symbolName,
    modulePath: moduleId,
    sourceText: "",
    top: 0,
    left: 0,
    zIndex: id,
  };
}

const base = [makeFrame(1, "a.ts", "A"), makeFrame(2, "b.ts", "B")];

describe("openFrame", () => {
  it("appends a new frame above every existing one", () => {
    const next = openFrame(base, { ...makeFrame(3, "c.ts", "C"), top: 5, left: 6 });
    expect(next).toHaveLength(3);
    expect(next[2]).toMatchObject({ id: 3, top: 5, left: 6, zIndex: 3 });
  });

  it("brings the existing frame to front instead of duplicating module+symbol", () => {
    const next = openFrame(base, makeFrame(9, "a.ts", "A"));
    expect(next).toHaveLength(2);
    expect(next.find((f) => f.id === 1)?.zIndex).toBe(3);
    expect(next.some((f) => f.id === 9)).toBe(false);
  });

  it("treats the same module with another symbol as a new frame", () => {
    const next = openFrame(base, makeFrame(3, "a.ts", "OtherSymbol"));
    expect(next).toHaveLength(3);
  });
});

describe("bringToFront", () => {
  it("raises the frame above the current top", () => {
    const next = bringToFront(base, 1);
    expect(next.find((f) => f.id === 1)?.zIndex).toBe(3);
  });

  it("keeps zIndexes untouched when the frame is already on top", () => {
    const next = bringToFront(base, 2);
    expect(next.map((f) => f.zIndex)).toEqual([1, 2]);
  });
});

describe("moveFrame", () => {
  it("repositions only the targeted frame", () => {
    const next = moveFrame(base, 2, { top: 40, left: 50 });
    expect(next.find((f) => f.id === 2)).toMatchObject({ top: 40, left: 50 });
    expect(next.find((f) => f.id === 1)).toMatchObject({ top: 0, left: 0 });
  });
});
