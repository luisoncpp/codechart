// @Architecture(descriptionShort="Runs diff impact against the graphs the active diff overlay was built from")
import type { DiffImpactReport, ReviewStackClient } from "../../ipc/review-stack-client";
import type { GraphSessionStore } from "../../state/graph-session";

/**
 * Shared by the MCP `analyze_diff_impact` method and the drawer's refresh.
 * Paste diffs have no before-graph, so `newDiagnosticsAvailable: false` tells
 * readers that an empty `newDiagnostics` is "not computed", not "clean".
 */
export async function requestDiffImpact(
  session: GraphSessionStore,
  client: ReviewStackClient,
  maxDepth = 3,
): Promise<DiffImpactReport> {
  const graph = session.getGraph();
  if (!graph) throw new Error("No project loaded.");
  const overlay = session.getDiffOverlay();
  const graphs = session.getDiffGraphs();
  const report = await client.analyzeDiffImpact({
    before: graphs?.before ?? null,
    after: graphs?.after ?? graph,
    changedModuleIds: overlay ? [...overlay.affectedModuleIds] : [],
    maxDepth,
  });
  return { ...report, newDiagnosticsAvailable: graphs !== null };
}
