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
});
