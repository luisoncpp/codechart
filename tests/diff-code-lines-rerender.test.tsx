/// <reference types="@testing-library/jest-dom" />
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DiffCodeLines } from "../src/features/graph_canvas/Private/highlight/DiffCodeLines";
import type { LineMatchRange } from "../src/features/graph_canvas/Private/highlight/match-highlight";

const tokenRenders = vi.hoisted(() => ({ count: 0 }));

vi.mock("../src/features/graph_canvas/Private/highlight/TokenText", async (importActual) => {
  const actual = await importActual<typeof import("../src/features/graph_canvas/Private/highlight/TokenText")>();
  return {
    TokenText: (props: Parameters<typeof actual.TokenText>[0]) => {
      tokenRenders.count++;
      return actual.TokenText(props);
    },
  };
});

const LINE_COUNT = 300;
const SOURCE = Array.from({ length: LINE_COUNT }, (_, i) => `foo${i}`).join("\n");

/** One `foo` match at column 0 of every line, as `codeMatchesByLine` builds it. */
function everyLineMatches(): ReadonlyMap<number, readonly LineMatchRange[]> {
  const byLine = new Map<number, readonly LineMatchRange[]>();
  for (let line = 1; line <= LINE_COUNT; line++) {
    byLine.set(line, [{ startCol: 0, endCol: 3, active: false }]);
  }
  return byLine;
}

describe("DiffCodeLines find-match re-rendering", () => {
  beforeEach(() => {
    tokenRenders.count = 0;
  });

  it("moving the active match re-renders only the two affected rows", () => {
    const matchesByLine = everyLineMatches();
    const { container, rerender } = render(
      <DiffCodeLines source={SOURCE} path="a.txt" matchesByLine={matchesByLine} activeMatch={{ line: 1, startCol: 0 }} />,
    );
    tokenRenders.count = 0;

    rerender(
      <DiffCodeLines source={SOURCE} path="a.txt" matchesByLine={matchesByLine} activeMatch={{ line: 2, startCol: 0 }} />,
    );

    expect(tokenRenders.count).toBeLessThanOrEqual(2);
    const active = container.querySelectorAll(".hl-match--active");
    expect(active).toHaveLength(1);
    expect(active[0]!.closest("[data-line]")).toHaveAttribute("data-line", "2");
  });

  it("changing one line's matches re-renders only that row", () => {
    const { container, rerender } = render(<DiffCodeLines source={SOURCE} path="a.txt" />);
    tokenRenders.count = 0;

    const oneLine = new Map([[7, [{ startCol: 0, endCol: 3, active: false }]]]);
    rerender(<DiffCodeLines source={SOURCE} path="a.txt" matchesByLine={oneLine} />);

    expect(tokenRenders.count).toBeLessThanOrEqual(1);
    expect(container.querySelectorAll(".hl-match")).toHaveLength(1);
  });
});
