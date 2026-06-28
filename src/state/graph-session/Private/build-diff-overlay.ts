import {
  compareGraphs,
  overlayFromPastedDiff,
  attachLineDiff,
  mergeCommitOverlay,
  type GraphDiffOverlay,
} from "../../../domain/diff";
import type { ProjectGraph } from "../../../domain/graph";
import { LayoutEngine } from "../../../domain/layout";
import type { AnalysisClient } from "../../../ipc/analysis-client";
import type { GitClient } from "../../../ipc/git-client";

export async function buildCommitDiffOverlay(
  client: AnalysisClient,
  git: GitClient,
  layoutEngine: LayoutEngine,
  root: string,
  baseRef: string,
  headRef: string,
): Promise<GraphDiffOverlay> {
  void client;
  const [before, after, unifiedDiff] = await Promise.all([
    git.analyzeProjectAtRef(root, baseRef),
    git.analyzeProjectAtRef(root, headRef),
    git.diffRefs(root, baseRef, headRef),
  ]);
  const pathOverlay = overlayFromPastedDiff(unifiedDiff, after);
  const graphOverlay = compareGraphs({ before, after });
  const partial = mergeCommitOverlay(pathOverlay, graphOverlay, before);
  const beforeLayout = await layoutEngine.layout(before);
  return attachLineDiff({ ...partial, beforeLayout }, unifiedDiff);
}

export function buildPasteDiffOverlay(
  text: string,
  graph: ProjectGraph,
): GraphDiffOverlay {
  const partial = overlayFromPastedDiff(text, graph);
  return attachLineDiff({ ...partial, beforeLayout: null }, text);
}
