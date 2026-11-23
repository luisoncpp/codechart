import { describe, expect, it } from "vitest";
import { afterOnlyRows, pairSplitRows, type DiffDisplayRow } from "../src/domain/diff";

const moved = { path: "src/other.ts", line: 3 };
const rows: DiffDisplayRow[] = [
  { kind: "context", lineNumber: 1, text: "a" },
  { kind: "remove", lineNumber: 2, text: "old b" },
  { kind: "move-remove", lineNumber: 3, text: "moved away", movedTo: moved, tooltip: "Moved to" },
  { kind: "add", lineNumber: 2, text: "new b" },
  { kind: "context", lineNumber: 3, text: "c" },
  { kind: "move-add", lineNumber: 4, text: "moved in", movedFrom: moved, tooltip: "Moved from" },
  { kind: "add", lineNumber: 5, text: "new e" },
  { kind: "context", lineNumber: 6, text: "f" },
];

const describePair = (pair: ReturnType<typeof pairSplitRows>[number]) => [
  pair.left ? `${pair.left.row.lineNumber}:${pair.left.row.text}` : "-",
  pair.right ? `${pair.right.row.lineNumber}:${pair.right.row.text}` : "-",
];

describe("afterOnlyRows", () => {
  it("drops deleted and moved-away rows, keeping added and moved-in rows", () => {
    expect(afterOnlyRows(rows).map((r) => r.kind)).toEqual([
      "context", "add", "context", "move-add", "add", "context",
    ]);
  });
});

describe("pairSplitRows", () => {
  it("zips removals with additions and pads the shorter side with filler", () => {
    expect(pairSplitRows(rows).map(describePair)).toEqual([
      ["1:a", "1:a"],
      ["2:old b", "2:new b"],
      ["3:moved away", "-"],
      ["4:c", "3:c"],
      ["-", "4:moved in"],
      ["-", "5:new e"],
      ["5:f", "6:f"],
    ]);
  });

  it("points every cell back at its unified row index for shared tokens", () => {
    const pairs = pairSplitRows(rows);
    expect(pairs[1]!.left!.index).toBe(1);
    expect(pairs[1]!.right!.index).toBe(3);
    expect(pairs[3]!.left!.index).toBe(pairs[3]!.right!.index);
  });

  it("keeps removals at the end of the file on the left", () => {
    const tail: DiffDisplayRow[] = [
      { kind: "context", lineNumber: 1, text: "a" },
      { kind: "remove", lineNumber: 2, text: "gone" },
    ];
    expect(pairSplitRows(tail).map(describePair)).toEqual([["1:a", "1:a"], ["2:gone", "-"]]);
  });
});
