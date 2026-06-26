import { describe, expect, it } from "vitest";
import { isTestModule, filterTestModules, projectForZoom, architectureViolations } from "../src/domain/graph";
import type { ProjectGraph } from "../src/domain/graph";

function module(id: string, groupId: string | null = null) {
  return {
    id,
    path: id,
    label: id.split("/").pop()!,
    language: "typescript" as const,
    groupId,
    isFacade: false,
    metrics: { loc: 1 },
    exportedSymbols: [],
  };
}

const base: ProjectGraph = {
  version: 1,
  root: "x",
  groups: [
    { id: "app", label: "App", parentId: null, facadeModuleIds: [], color: "#000" },
    { id: "tests", label: "Tests", parentId: null, facadeModuleIds: [], color: "#000" },
  ],
  modules: [
    module("src/app.ts", "app"),
    module("src/app.test.ts", "app"),
    module("tests/integration.test.ts", "tests"),
    module("src/__tests__/util.ts", "app"),
  ],
  edges: [
    {
      id: "a",
      source: "src/app.ts",
      target: "src/app.test.ts",
      kind: "import",
      isViolation: false,
    },
    {
      id: "b",
      source: "tests/integration.test.ts",
      target: "src/app.ts",
      kind: "import",
      isViolation: false,
    },
    {
      id: "c",
      source: "src/app.ts",
      target: "src/__tests__/util.ts",
      kind: "import",
      isViolation: false,
    },
  ],
  diagnostics: [],
};

describe("isTestModule", () => {
  it("matches common test file suffixes", () => {
    expect(isTestModule("src/foo.test.ts")).toBe(true);
    expect(isTestModule("src/foo.spec.tsx")).toBe(true);
    expect(isTestModule("src/Foo.Test.ts")).toBe(true);
  });

  it("matches test directory segments", () => {
    expect(isTestModule("tests/integration.test.ts")).toBe(true);
    expect(isTestModule("src/__tests__/util.ts")).toBe(true);
    expect(isTestModule("src/test/helpers.ts")).toBe(true);
  });

  it("does not match production paths", () => {
    expect(isTestModule("src/app.ts")).toBe(false);
    expect(isTestModule("src/contest/winner.ts")).toBe(false);
    expect(isTestModule("src/testing-utils.ts")).toBe(false);
  });
});

describe("filterTestModules", () => {
  it("removes test modules, their edges, and empty groups", () => {
    const filtered = filterTestModules(base);
    expect(filtered.modules.map((m) => m.id)).toEqual(["src/app.ts"]);
    expect(filtered.edges).toHaveLength(0);
    expect(filtered.groups.map((g) => g.id)).toEqual(["app"]);
  });

  it("is a no-op when there are no test modules", () => {
    const prodOnly: ProjectGraph = {
      ...base,
      modules: [module("src/app.ts", "app")],
      edges: [],
      groups: base.groups.slice(0, 1),
    };
    expect(filterTestModules(prodOnly)).toEqual(prodOnly);
  });

  it("filter before zoom keeps groups when L0 collapse hides their modules", () => {
    const withUngroupedTest: ProjectGraph = {
      ...base,
      modules: [...base.modules, module("src/smoke.test.ts", null)],
    };
    const collapsed = new Set(["app", "tests"]);
    const zoomed = projectForZoom(withUngroupedTest, collapsed);
    expect(filterTestModules(zoomed).groups).toHaveLength(0);

    const filtered = filterTestModules(withUngroupedTest);
    const zoomedAfterFilter = projectForZoom(filtered, collapsed);
    expect(zoomedAfterFilter.groups.map((g) => g.id)).toEqual(["app"]);
  });
});

describe("architectureViolations", () => {
  it("omits facade bypasses from test importers", () => {
    const graph: ProjectGraph = {
      ...base,
      diagnostics: [
        {
          id: "architectureViolation:prod",
          severity: "warning",
          kind: "architectureViolation",
          message: "src/app.ts imports src/core/store.ts, bypassing the core facade",
          moduleId: "src/app.ts",
        },
        {
          id: "architectureViolation:test",
          severity: "warning",
          kind: "architectureViolation",
          message: "src/app.test.ts imports src/core/store.ts, bypassing the core facade",
          moduleId: "src/app.test.ts",
        },
      ],
    };
    const violations = architectureViolations(graph);
    expect(violations).toHaveLength(1);
    expect(violations[0].moduleId).toBe("src/app.ts");
  });
});
