import { expect } from "vitest";
import type { ProjectGraph } from "../../src/domain/graph";

export function expectTauriMiniIpcAndDiagnostics(graph: ProjectGraph): void {
  const ipc = graph.edges.find((e) => e.trigger === "ipc:greet");
  expect(ipc?.kind).toBe("soft");
  expect(ipc?.source).toBe("src/ipc/client.ts");
  expect(ipc?.target).toBe("src-tauri/src/commands.rs");

  const orphan = graph.diagnostics.find((d) => d.kind === "unresolvedIpc");
  expect(orphan?.moduleId).toBe("src/ipc/orphan.ts");
  expect(orphan?.unresolvedTarget).toBe("missing_cmd");
}
