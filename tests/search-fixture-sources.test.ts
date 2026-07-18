import { describe, expect, it } from "vitest";
import { searchSourceEntries } from "../src/ipc/analysis-client/Private/search-fixture-sources";

describe("searchSourceEntries", () => {
  it("finds case-insensitive matches with 1-based line numbers", () => {
    const entries = [["a.ts", "const x = 1;\n// todo later\nconst y = 2;"]] as const;

    const result = searchSourceEntries(entries, "TODO", /*cap=*/ 500);

    expect(result.matches).toEqual([
      { path: "a.ts", line: 2, lineText: "// todo later" },
    ]);
    expect(result.truncated).toBe(false);
  });

  it("emits one match per file even with multiple matching lines", () => {
    const entries = [["a.ts", "foo\nfoo"]] as const;

    const result = searchSourceEntries(entries, "foo", /*cap=*/ 500);

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].line).toBe(1);
  });

  it("stops at the cap and reports truncation", () => {
    const entries = [
      ["a.ts", "needle"],
      ["b.ts", "needle"],
      ["c.ts", "needle"],
    ] as const;

    const result = searchSourceEntries(entries, "needle", /*cap=*/ 2);

    expect(result.matches).toHaveLength(2);
    expect(result.truncated).toBe(true);
  });

  it("trims the matching line text", () => {
    const entries = [["a.ts", "    indented needle    "]] as const;

    const result = searchSourceEntries(entries, "needle", /*cap=*/ 500);

    expect(result.matches[0].lineText).toBe("indented needle");
  });

  it("returns nothing for an empty query", () => {
    const entries = [["a.ts", "anything"]] as const;

    const result = searchSourceEntries(entries, "", /*cap=*/ 500);

    expect(result).toEqual({ matches: [], truncated: false });
  });
});
