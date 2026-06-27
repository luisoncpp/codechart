import { describe, expect, it } from "vitest";
import {
  splitIdentifierSegments,
  wrapIdentifierLines,
} from "../src/domain/layout/Private/wrap-identifier";

describe("splitIdentifierSegments", () => {
  it("splits camelCase words", () => {
    expect(splitIdentifierSegments("exportStagingController")).toEqual([
      "export",
      "Staging",
      "Controller",
    ]);
  });

  it("splits on path and punctuation separators", () => {
    expect(splitIdentifierSegments("tauri-analysis-client.ts")).toEqual([
      "tauri-",
      "analysis-",
      "client.ts",
    ]);
  });
});

describe("wrapIdentifierLines", () => {
  it("keeps camelCase words intact", () => {
    expect(wrapIdentifierLines("exportStagingController", 14)).toEqual([
      "exportStaging",
      "Controller",
    ]);
  });

  it("breaks at separators before mid-word breaks", () => {
    expect(wrapIdentifierLines("tauri-analysis-client.ts", 12)).toEqual([
      "tauri-",
      "analysis-",
      "client.ts",
    ]);
  });

  it("prefers a balanced split when line count ties", () => {
    expect(wrapIdentifierLines("oneTwoThreeFour", 10)).toEqual([
      "oneTwo",
      "ThreeFour",
    ]);
  });

  it("hard-breaks a segment that exceeds the line width", () => {
    expect(wrapIdentifierLines("abcdefghij", 4)).toEqual(["abcd", "efgh", "ij"]);
  });

  it("keeps a short file extension with its basename", () => {
    expect(splitIdentifierSegments("store.ts")).toEqual(["store.ts"]);
    expect(wrapIdentifierLines("store.ts", 8)).toEqual(["store.ts"]);
    expect(wrapIdentifierLines("store.ts", 6)).toEqual(["store", ".ts"]);
  });
});
