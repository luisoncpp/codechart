import { describe, expect, it } from "vitest";
import { normalizeSectionKey, findSectionInSource } from "../src/features/graph_canvas/Private/wiki_links/wiki-link-section";
import { splitWikiTarget } from "../src/features/graph_canvas/Private/wiki_links/wiki-link-target-split";

describe("splitWikiTarget", () => {
  it("splits path and section on the first hash", () => {
    expect(splitWikiTarget("docs/x.md#Open project")).toEqual({
      pathPart: "docs/x.md",
      section: "Open project",
    });
  });

  it("treats a hash-only target as same-file", () => {
    expect(splitWikiTarget("#Validation")).toEqual({ pathPart: "", section: "Validation" });
  });

  it("returns null section when empty after hash", () => {
    expect(splitWikiTarget("store.ts#")).toEqual({ pathPart: "store.ts", section: null });
  });
});

describe("normalizeSectionKey", () => {
  it("collapses case, spaces, and hyphens", () => {
    expect(normalizeSectionKey("Layout pass")).toBe("layout-pass");
    expect(normalizeSectionKey("layout-pass")).toBe("layout-pass");
    expect(normalizeSectionKey("  Open Project  ")).toBe("open-project");
  });
});

describe("findSectionInSource", () => {
  it("finds @Section markers in code files", () => {
    const source = "line1\n// @Section(Validation)\nline3\n";
    expect(findSectionInSource(source, "src/a.ts", "validation")).toEqual({
      line: 2,
      anchorId: "validation",
    });
  });

  it("finds ATX headings in markdown files", () => {
    const source = "# Title\n\n## Open project\n\nbody\n";
    expect(findSectionInSource(source, "docs/a.md", "Open project")).toEqual({
      line: 3,
      anchorId: "open-project",
    });
  });

  it("returns the first match in file order", () => {
    const source = "// @Section(A)\n// @Section(B)\n";
    expect(findSectionInSource(source, "x.ts", "b")?.line).toBe(2);
    expect(findSectionInSource(source, "x.ts", "a")?.line).toBe(1);
  });

  it("returns null when no section matches", () => {
    expect(findSectionInSource("// plain\n", "x.ts", "Missing")).toBeNull();
  });

  it("matches @Section names with internal spaces", () => {
    const source = "# @Section(Metrics window)\n";
    expect(findSectionInSource(source, "x.ts", "metrics-window")?.line).toBe(1);
  });

  it("ignores ATX headings in code files", () => {
    const source = "## Not a section\n// @Section(Real)\n";
    expect(findSectionInSource(source, "x.ts", "not-a-section")).toBeNull();
    expect(findSectionInSource(source, "x.ts", "real")?.line).toBe(2);
  });

  it("ignores @Section markers in markdown files", () => {
    const source = "<!-- @Section(Hidden) -->\n## Visible\n";
    expect(findSectionInSource(source, "doc.md", "hidden")).toBeNull();
    expect(findSectionInSource(source, "doc.md", "visible")?.line).toBe(2);
  });
});
