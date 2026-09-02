/// <reference types="@testing-library/jest-dom" />
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DiffCodeLines } from "../src/features/graph_canvas/Private/highlight/DiffCodeLines";

// A single line wider than the 680px default frame: the `@Architecture` comment
// of FlashEntitySource.ts, which made the frame body scroll sideways.
const LONG_LINE =
  '// @Architecture(descriptionShort="Sprite-lookup contract the hit-flash overlay reads entities through; declared here, not in EntityManager or IActorView, because both depend back on FlashRenderer.")';

describe("preview frame code line wrapping", () => {
  it("wraps rows when wrapLines is set, so a long line cannot widen the frame body", () => {
    const { container } = render(
      <DiffCodeLines
        source={LONG_LINE}
        path="FlashEntitySource.ts"
        lineClassPrefix="symbol-widget"
        wrapLines
      />,
    );

    const row = container.querySelector<HTMLElement>(".symbol-widget__line")!;
    // An inline `white-space: pre` would beat the stylesheet's `pre-wrap`.
    expect(row.style.whiteSpace).toBe("pre-wrap");
    expect(row.style.overflowWrap).toBe("anywhere");
  });

  it("keeps L2 card rows unwrapped", () => {
    const { container } = render(<DiffCodeLines source={LONG_LINE} path="a.ts" />);

    const row = container.querySelector<HTMLElement>(".diff-code__line")!;
    expect(row.style.whiteSpace).toBe("pre");
    expect(row.style.overflowWrap).toBe("");
  });
});
