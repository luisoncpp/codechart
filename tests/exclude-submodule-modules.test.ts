import { describe, expect, it } from "vitest";
import { excludeSubmoduleModules } from "../src/domain/diff";
import type { ProjectGraph } from "../src/domain/graph";
import goldenGraph from "./fixtures/golden/project-graph.json";

const graph = goldenGraph as unknown as ProjectGraph;

describe("excludeSubmoduleModules", () => {
  it("drops modules and edges under submodule roots", () => {
    const submodule = {
      ...graph.modules[0],
      id: "typelords-input/src/lib.rs",
      path: "typelords-input/src/lib.rs",
      label: "lib.rs",
    };
    const parent = graph.modules[0];
    const input: ProjectGraph = {
      ...graph,
      modules: [parent, submodule],
      edges: [
        {
          id: "e1",
          source: parent.id,
          target: submodule.id,
          kind: "import",
          trigger: "import",
          isViolation: false,
        },
      ],
    };

    const filtered = excludeSubmoduleModules(input, ["typelords-input"]);

    expect(filtered.modules.map((module) => module.id)).toEqual([parent.id]);
    expect(filtered.edges).toEqual([]);
  });

  it("returns the same graph when there are no submodule roots", () => {
    expect(excludeSubmoduleModules(graph, [])).toBe(graph);
  });
});
