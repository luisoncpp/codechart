import { describe, expect, it } from "vitest";
import tauriMiniGraph from "../fixtures/golden/tauri-mini-project-graph.json";
import { ProjectGraph } from "../../src/domain/graph";
import { expectTauriMiniIpcAndDiagnostics } from "../helpers/tauri-mini-graph";

describe("flow: analyze-project", () => {
  it("tauri-mini golden JSON exposes IPC seam edges and unresolvedIpc on the TS side", () => {
    const graph = tauriMiniGraph as ProjectGraph;

    expect(graph.root).toBe("tests/fixtures/tauri-mini-project");
    expect(graph.modules).toHaveLength(5);
    expect(new Set(graph.modules.map((m) => m.language))).toEqual(
      new Set(["rust", "typescript"]),
    );

    expectTauriMiniIpcAndDiagnostics(graph);
  });
});
