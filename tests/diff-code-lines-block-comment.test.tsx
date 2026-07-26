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
});
