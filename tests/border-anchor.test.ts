import { describe, expect, it } from "vitest";
import { borderAnchor, centerOf } from "../src/features/graph_canvas";

const box = { x: 0, y: 0, width: 100, height: 40 };

describe("borderAnchor (floating edge anchors — Idea 1)", () => {
  it("exits the right side toward a node to the right", () => {
    const a = borderAnchor(box, { x: 500, y: 20 });
    expect(a.side).toBe("right");
    expect(a.x).toBe(100);
  });

  it("exits the left side toward a node to the left", () => {
    const a = borderAnchor(box, { x: -500, y: 20 });
    expect(a.side).toBe("left");
    expect(a.x).toBe(0);
  });

  it("exits the top/bottom when the other node is mostly above/below", () => {
    expect(borderAnchor(box, { x: 50, y: -500 }).side).toBe("top");
    expect(borderAnchor(box, { x: 50, y: 500 }).side).toBe("bottom");
  });

  it("anchors of two different targets land on different border points", () => {
    const up = borderAnchor(box, { x: 50, y: -500 });
    const right = borderAnchor(box, { x: 500, y: 20 });
    expect(up).not.toEqual(right); // out-edges fan instead of sharing one point
  });

  it("returns the center when the target coincides with the center", () => {
    const c = centerOf(box);
    expect(borderAnchor(box, c)).toMatchObject({ x: c.x, y: c.y });
  });

  it("the exit point always sits on the box border", () => {
    const a = borderAnchor(box, { x: 300, y: 300 });
    const onEdge =
      a.x === box.x ||
      a.x === box.x + box.width ||
      a.y === box.y ||
      a.y === box.y + box.height;
    expect(onEdge).toBe(true);
  });
});
