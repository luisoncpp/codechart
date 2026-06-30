import { describe, expect, it } from "vitest";
import tauriMiniGraph from "../fixtures/golden/tauri-mini-project-graph.json";
import { ProjectGraph } from "../../src/domain/graph";

describe("flow: analyze-project", () => {
  it("tauri-mini golden JSON exposes IPC seam edges and unresolvedIpc on the TS side", () => {
    const graph = tauriMiniGraph as ProjectGraph;

    expect(graph.root).toBe("tests/fixtures/tauri-mini-project");
    expect(graph.modules).toHaveLength(5);
    expect(new Set(graph.modules.map((m) => m.language))).toEqual(
      new Set(["rust", "typescript"]),
    );

    const ipc = graph.edges.find((e) => e.trigger === "ipc:greet");
    expect(ipc?.kind).toBe("soft");
    expect(ipc?.source).toBe("src/ipc/client.ts");
    expect(ipc?.target).toBe("src-tauri/src/commands.rs");

    const orphan = graph.diagnostics.find((d) => d.kind === "unresolvedIpc");
    expect(orphan?.moduleId).toBe("src/ipc/orphan.ts");
    expect(orphan?.unresolvedTarget).toBe("missing_cmd");
  });
});
