import { describe, expect, it } from "vitest";
import { stripMarkdownFrontmatter } from "../src/features/graph_canvas/Private/MarkdownBody";

describe("stripMarkdownFrontmatter", () => {
  it("removes a leading YAML fence", () => {
    const md = "---\ntitle: x\n---\n\n# Hello\n";
    expect(stripMarkdownFrontmatter(md)).toBe("# Hello\n");
  });

  it("returns plain markdown unchanged", () => {
    const md = "# Title\n\nParagraph.";
    expect(stripMarkdownFrontmatter(md)).toBe(md);
  });
});
