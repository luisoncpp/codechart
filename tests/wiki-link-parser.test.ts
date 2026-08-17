import { describe, expect, it } from "vitest";
import {
  findWikiLinks,
  matchWikiLinkPrefix,
} from "../src/features/graph_canvas/Private/wiki_links/wiki-link-parser";

describe("findWikiLinks", () => {
  it("finds a link's columns, target, and label", () => {
    const [link] = findWikiLinks("// see [[docs/flows/x.md]] for details");
    expect(link).toEqual({
      startCol: 7,
      endCol: 26,
      target: "docs/flows/x.md",
      label: "docs/flows/x.md",
    });
  });

  it("uses the pipe label when present", () => {
    const [link] = findWikiLinks("/* [[docs/x.md|the diff flow]] */");
    expect(link?.target).toBe("docs/x.md");
    expect(link?.label).toBe("the diff flow");
  });

  it("returns several links per line in column order", () => {
    const links = findWikiLinks("// [[a.md]] and [[b.md]]");
    expect(links.map((l) => l.target)).toEqual(["a.md", "b.md"]);
    expect(links[0]!.endCol).toBeLessThan(links[1]!.startCol);
  });

  it("ignores empty targets and unclosed brackets", () => {
    expect(findWikiLinks("// [[]] [[   ]] [[unclosed")).toEqual([]);
  });

  it("does not match nested brackets in real code", () => {
    expect(findWikiLinks("const m = new Map([[1, [2]]]);")).toEqual([]);
  });

  it("scans a pathological line in linear time", () => {
    // A stall here is synchronous, so a vitest `timeout` cannot catch it —
    // see docs/lessons-learned/one-regex-for-two-import-forms-is-a-redos.md
    const line = `// ${"[".repeat(2000)}${"a".repeat(2000)}`;
    const started = Date.now();
    expect(findWikiLinks(line)).toEqual([]);
    expect(Date.now() - started).toBeLessThan(100);
  });
});

describe("matchWikiLinkPrefix", () => {
  it("matches only at the start", () => {
    expect(matchWikiLinkPrefix("[[a.md]] trailing")).toEqual({
      raw: "[[a.md]]",
      target: "a.md",
      label: "a.md",
    });
    expect(matchWikiLinkPrefix("x [[a.md]]")).toBeNull();
  });
});
