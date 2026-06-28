import { createMockGitClient } from "../../src/ipc/git-client";
import { createMockAnalysisClient } from "../../src/ipc/analysis-client";
import { GraphSessionStore } from "../../src/state/graph-session";
import { ElkLayoutEngine } from "../../src/domain/layout";
import type { AnalysisClient } from "../src/ipc/analysis-client";

export function testGraphSessionStore(
  client: AnalysisClient = createMockAnalysisClient(),
): GraphSessionStore {
  return new GraphSessionStore(client, createMockGitClient(), new ElkLayoutEngine());
}
