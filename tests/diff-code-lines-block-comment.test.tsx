/// <reference types="@testing-library/jest-dom" />
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DiffCodeLines } from "../src/features/graph_canvas/Private/highlight/DiffCodeLines";

const SOURCE = ["/**", " * doc line", " */", "const x = 1;"].join("\n");

describe("DiffCodeLines block comments", () => {
  it("highlights every line of a multi-line block comment", () => {
    const { container } = render(<DiffCodeLines source={SOURCE} path="a.ts" />);
    const lines = [...container.querySelectorAll(".diff-code__text")];

    expect(lines).toHaveLength(4);
    for (const line of lines.slice(0, 3)) {
      expect([...line.children].every((span) => span.className === "hl-comment")).toBe(true);
    }
    expect(lines[3]!.querySelector(".hl-keyword")).toHaveTextContent("const");
  });

  it("renders gutter and line numbers with compact sizing", () => {
    const { container } = render(
      <DiffCodeLines
        source={"line 1\nline 2"}
        path="a.ts"
        fileDiff={{
          addedLineNumbers: new Set([2]),
          removeBeforeLine: new Map([[2, ["deleted line"]]]),
        }}
      />
    );

    const rows = container.querySelectorAll(".diff-code__line");
    expect(rows).toHaveLength(3);

    // Row 0: context row "line 1"
    expect(rows[0]!.querySelector(".diff-code__gutter")).toHaveTextContent("");
    expect(rows[0]!.querySelector(".diff-code__ln")).toHaveTextContent("1");

    // Row 1: remove row "deleted line"
    expect(rows[1]!.querySelector(".diff-code__gutter")).toHaveTextContent("-");
    expect(rows[1]!.querySelector(".diff-code__ln")).toHaveTextContent("");

    // Row 2: add row "line 2"
    expect(rows[2]!.querySelector(".diff-code__gutter")).toHaveTextContent("+");
    expect(rows[2]!.querySelector(".diff-code__ln")).toHaveTextContent("2");
  });

  it("renders moved lines with move-add / move-remove classes and title tooltips", () => {
    const { container } = render(
      <DiffCodeLines
        source={"destination line"}
        path="dest.ts"
        fileDiff={{
          addedLineNumbers: new Set([1]),
          removeBeforeLine: new Map([[1, ["source moved line"]]]),
          movedAddedLines: new Map([[1, { path: "source.ts", line: 10 }]]),
          movedRemovedLines: new Map([[1, { path: "other.ts", line: 20 }]]),
        }}
      />
    );

    const rows = container.querySelectorAll(".diff-code__line");
    expect(rows).toHaveLength(2);

    // Row 0: move-remove row
    expect(rows[0]!.className).toContain("diff-code__line--move-remove");
    expect(rows[0]!.getAttribute("title")).toBe("Moved to other.ts:20");
    expect(rows[0]!.querySelector(".diff-code__gutter")!.className).toContain("diff-code__gutter--move-remove");
    expect(rows[0]!.querySelector(".diff-code__gutter")).toHaveTextContent("-");
    expect(rows[0]!.querySelector(".diff-code__ln")).toHaveTextContent("");

    // Row 1: move-add row
    expect(rows[1]!.className).toContain("diff-code__line--move-add");
    expect(rows[1]!.getAttribute("title")).toBe("Moved from source.ts:10");
    expect(rows[1]!.querySelector(".diff-code__gutter")!.className).toContain("diff-code__gutter--move-add");
    expect(rows[1]!.querySelector(".diff-code__gutter")).toHaveTextContent("+");
    expect(rows[1]!.querySelector(".diff-code__ln")).toHaveTextContent("1");
  });
});

