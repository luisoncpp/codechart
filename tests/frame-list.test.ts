import { describe, expect, it } from "vitest";
import {
  openFrame,
  resizeFrame,
  type PreviewFrame,
} from "../src/features/graph_canvas/Private/preview_frames/frame-list";

const base: PreviewFrame = {
  id: 1,
  moduleId: "src/a.ts",
  moduleLabel: "a.ts",
  symbolName: null,
  modulePath: "src/a.ts",
  color: "#000",
  sourceText: "v1",
  top: 0,
  left: 0,
  zIndex: 1,
  pinned: false,
  activeRange: { startLine: 1, endLine: 1 },
};

describe("openFrame dedupe", () => {
  it("merges activeRange onto an existing frame instead of duplicating", () => {
    const next = openFrame([base], {
      ...base,
      id: 2,
      sourceText: "v2",
      activeRange: { startLine: 42, endLine: 42 },
    });
    expect(next).toHaveLength(1);
    expect(next[0]?.activeRange).toEqual({ startLine: 42, endLine: 42 });
    expect(next[0]?.sourceText).toBe("v2");
    expect(next[0]?.zIndex).toBe(1);
  });

  it("raises zIndex only when another frame is already on top", () => {
    const under: PreviewFrame = { ...base, id: 1, zIndex: 1 };
    const over: PreviewFrame = { ...base, id: 2, moduleId: "src/b.ts", zIndex: 3 };
    const next = openFrame([under, over], {
      ...under,
      id: 3,
      sourceText: "v2",
      activeRange: { startLine: 42, endLine: 42 },
    });
    expect(next).toHaveLength(2);
    expect(next.find((f) => f.id === 1)?.zIndex).toBe(4);
  });

  it("keeps activeRange when the incoming frame omits it", () => {
    const next = openFrame([base], { ...base, id: 2, sourceText: "v2" });
    expect(next[0]?.activeRange).toEqual({ startLine: 1, endLine: 1 });
  });

  it("updates activeRange when a new range is provided", () => {
    const next = openFrame([base], {
      ...base,
      id: 2,
      sourceText: "v2",
      activeRange: { startLine: 99, endLine: 99 },
    });
    expect(next[0]?.activeRange).toEqual({ startLine: 99, endLine: 99 });
  });

  it("merges sectionAnchor for markdown section re-scroll", () => {
    const next = openFrame([base], {
      ...base,
      id: 2,
      sourceText: "v2",
      sectionAnchor: "setup",
    });
    expect(next[0]?.sectionAnchor).toBe("setup");
  });

  it("keeps the committed size, since the incoming one is only a creation seed", () => {
    // Re-opening a document passes the same DOCUMENT_FRAME_HEIGHT every time,
    // so copying it would silently undo the user's corner-grip resize —
    // `top`/`left` are preserved on dedupe for exactly the same reason.
    const resized: PreviewFrame = { ...base, width: 420, height: 300 };

    const next = openFrame([resized], { ...base, id: 2, sourceText: "v2", height: 720 });

    expect(next[0]?.width).toBe(420);
    expect(next[0]?.height).toBe(300);
  });
});

describe("resizeFrame", () => {
  it("commits a width and height onto the addressed frame only", () => {
    const other: PreviewFrame = { ...base, id: 2, moduleId: "src/b.ts" };

    const next = resizeFrame([base, other], 1, { width: 500, height: 400 });

    expect(next[0]).toMatchObject({ width: 500, height: 400 });
    expect(next[1]?.width).toBeUndefined();
  });
});
