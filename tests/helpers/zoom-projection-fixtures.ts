import { expect } from "vitest";
import type { ProjectGraph } from "../../src/domain/graph";

export function importEdge(source: string, target: string) {
  return {
    id: `${source}->${target}:import:0`,
    source,
    target,
    kind: "import" as const,
    trigger: "import" as const,
    isViolation: false,
  };
}

export function expectNoBidirectionalGroupEdge(
  reduced: ProjectGraph,
  groupA: string,
  groupB: string,
) {
  expect(
    reduced.edges.some(
      (e) =>
        (e.source === groupA && e.target === groupB) ||
        (e.source === groupB && e.target === groupA),
    ),
  ).toBe(false);
}

export function expectOnlyMainModule(
  reduced: ProjectGraph,
  groupIds: string[],
) {
  expect(reduced.modules.map((m) => m.id)).toEqual(["src/main.ts"]);
  expect(reduced.groups.map((g) => g.id).sort()).toEqual([...groupIds].sort());
}
