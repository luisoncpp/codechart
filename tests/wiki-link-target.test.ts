import { describe, expect, it } from "vitest";
import {
  baseNameOf,
  isMarkdownPath,
  modulePathSuffixMatch,
  resolveWikiPath,
  wikiLinkCandidates,
} from "../src/features/graph_canvas/Private/wiki_links";

const FROM = "src/core/store.ts";

describe("resolveWikiPath", () => {
  it("reads a plain target as project-relative", () => {
    expect(resolveWikiPath("docs/flows/x.md", FROM)).toBe("docs/flows/x.md");
  });

  it("resolves ./ and ../ against the linking file's directory", () => {
    expect(resolveWikiPath("./validate.ts", FROM)).toBe("src/core/validate.ts");
    expect(resolveWikiPath("../services/api.ts", FROM)).toBe("src/services/api.ts");
  });

  it("rejects absolute paths and targets that escape the project root", () => {
    expect(resolveWikiPath("/etc/passwd", FROM)).toBeNull();
    expect(resolveWikiPath("C:/secrets.txt", FROM)).toBeNull();
    expect(resolveWikiPath("../../../../secrets.txt", FROM)).toBeNull();
  });

  it("normalizes backslashes", () => {
    expect(resolveWikiPath("docs\\flows\\x.md", FROM)).toBe("docs/flows/x.md");
  });
});

describe("modulePathSuffixMatch", () => {
  const paths = ["src/core/store.ts", "src/ui/store.ts", "src/core/todo.ts"];

  it("matches the shortest module path ending in the target", () => {
    expect(modulePathSuffixMatch(paths, "store.ts")).toBe("src/ui/store.ts");
    expect(modulePathSuffixMatch(paths, "core/store.ts")).toBe("src/core/store.ts");
  });

  it("does not match a partial file name", () => {
    expect(modulePathSuffixMatch(paths, "ore.ts")).toBeNull();
  });
});

describe("wikiLinkCandidates", () => {
  const paths = ["src/core/store.ts"];

  it("prefers a module match for a bare name", () => {
    const link = { target: "store.ts", fromPath: "src/ui/App.tsx" };
    expect(wikiLinkCandidates(link, paths)).toEqual(["src/core/store.ts", "store.ts"]);
  });

  it("prefers the written path when the target has a directory", () => {
    const link = { target: "docs/x.md", fromPath: "src/ui/App.tsx" };
    expect(wikiLinkCandidates(link, paths)).toEqual(["docs/x.md"]);
  });

  it("walks up to the project root but no further", () => {
    const inRoot = { target: "../../outside.md", fromPath: "src/ui/App.tsx" };
    expect(wikiLinkCandidates(inRoot, paths)).toEqual(["outside.md"]);
    const aboveRoot = { target: "../../../outside.md", fromPath: "src/ui/App.tsx" };
    expect(wikiLinkCandidates(aboveRoot, paths)).toEqual([]);
  });

  it("resolves path before the hash, not the fragment", () => {
    const link = { target: "store.ts#Validation", fromPath: "src/ui/App.tsx" };
    expect(wikiLinkCandidates(link, paths)).toEqual(["src/core/store.ts", "store.ts"]);
  });

  it("uses fromPath only for same-file fragment links", () => {
    const link = { target: "#Validation", fromPath: "src/core/store.ts" };
    expect(wikiLinkCandidates(link, paths)).toEqual(["src/core/store.ts"]);
  });

  it("returns no candidates for a same-file link without fromPath", () => {
    expect(wikiLinkCandidates({ target: "#Section", fromPath: "" }, paths)).toEqual([]);
  });
});

describe("path helpers", () => {
  it("recognizes markdown destinations", () => {
    expect(isMarkdownPath("docs/x.MD")).toBe(true);
    expect(isMarkdownPath("README.markdown")).toBe(true);
    expect(isMarkdownPath("src/core/store.ts")).toBe(false);
  });

  it("takes the file name for a frame title", () => {
    expect(baseNameOf("docs/flows/x.md")).toBe("x.md");
  });
});
