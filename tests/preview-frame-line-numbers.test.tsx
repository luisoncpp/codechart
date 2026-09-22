/// <reference types="@testing-library/jest-dom" />
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DiffCodeLines } from "../src/features/graph_canvas/Private/highlight/DiffCodeLines";

/** A file long enough that its gutter needs three digits. */
const SOURCE = Array.from({ length: 120 }, (_, i) => `const line${i + 1} = ${i + 1};`).join("\n");

function lineNumberCells(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(".symbol-widget__ln"));
}

describe("preview frame line-number gutter", () => {
  it("never wraps a multi-digit number onto its own row", () => {
    const { container } = render(
      <DiffCodeLines source={SOURCE} path="a.ts" lineClassPrefix="symbol-widget" wrapLines />,
    );

    // The row sets `pre-wrap` + `overflow-wrap: anywhere`, and both inherit into
    // the number cell; unless the cell opts out, "120" renders one digit per row.
    for (const cell of lineNumberCells(container)) {
      expect(cell.style.whiteSpace).toBe("pre");
      expect(cell.style.overflowWrap).toBe("normal");
    }
  });

  it("reserves the same width for every row, sized to the widest number", () => {
    const { container } = render(
      <DiffCodeLines source={SOURCE} path="a.ts" lineClassPrefix="symbol-widget" wrapLines />,
    );

    const cells = lineNumberCells(container);
    expect(cells).toHaveLength(120);
    // 3 digits for line 120, plus the trailing gap. A `<button>` carries the UA
    // `padding-inline: 6px` under `box-sizing: border-box`, so the left padding
    // must be zeroed or it eats the reserved width.
    for (const cell of cells) {
      expect(cell.style.flex).toMatch(/^0 0 calc\(.*\b3ch\b.*\)$/);
      expect(cell.style.paddingLeft).toBe("0px");
    }
  });

  it("keeps the gutter narrow for short files", () => {
    const { container } = render(
      <DiffCodeLines source={"a\nb\nc"} path="a.ts" lineClassPrefix="symbol-widget" wrapLines />,
    );

    expect(lineNumberCells(container)[0]!.style.flex).toMatch(/^0 0 calc\(.*\b1ch\b.*\)$/);
  });
});
