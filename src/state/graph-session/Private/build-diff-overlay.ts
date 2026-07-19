import {
  compareGraphs,
  overlayFromPastedDiff,
  attachLineDiff,
  attachSymbolDiff,
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
  const overlay = attachLineDiff({ ...partial, beforeLayout }, unifiedDiff);
  const paths = [...overlay.lineDiffByPath.keys()];
  const [beforeSources, afterSources] = await Promise.all([
    git.readModuleSourcesAtRef(root, baseRef, knownPaths(before, paths)),
    git.readModuleSourcesAtRef(root, headRef, knownPaths(after, paths)),
  ]);
  const afterSourceByPath = new Map(Object.entries(afterSources));
  return attachSymbolDiff({ ...overlay, afterSourceByPath }, {
    before,
    after,
    beforeSources: new Map(Object.entries(beforeSources)),
    afterSources: afterSourceByPath,
    lineDiffByPath: overlay.lineDiffByPath,
  });
}

export function buildPasteDiffOverlay(
  text: string,
  graph: ProjectGraph,
): GraphDiffOverlay {
  const partial = overlayFromPastedDiff(text, graph);
  return attachLineDiff({ ...partial, beforeLayout: null }, text);
}

interface WorkingTreeDiffInput {
  client: AnalysisClient;
  git: GitClient;
  layoutEngine: LayoutEngine;
  root: string;
  baseRef: string;
  current: ProjectGraph;
}

export async function buildWorkingTreeDiffOverlay(
  input: WorkingTreeDiffInput,
): Promise<GraphDiffOverlay> {
  const { git, layoutEngine, root, baseRef, current } = input;
  const [before, unifiedDiff] = await Promise.all([
    git.analyzeProjectAtRef(root, baseRef),
    git.diffWorkingTree(
      root,
      baseRef,
      current.modules.map((module) => module.path),
    ),
  ]);
  const pathOverlay = overlayFromPastedDiff(unifiedDiff, current);
  const graphOverlay = compareGraphs({ before, after: current });
  const partial = mergeCommitOverlay(pathOverlay, graphOverlay, before);
  const beforeLayout = await layoutEngine.layout(before);
  const overlay = attachLineDiff({ ...partial, beforeLayout }, unifiedDiff);
  const paths = [...overlay.lineDiffByPath.keys()];
  const [beforeSources, afterSources] = await Promise.all([
    git.readModuleSourcesAtRef(root, baseRef, knownPaths(before, paths)),
    readWorkingSources({ graph: current, client: input.client, root, paths }),
  ]);
  return attachSymbolDiff({ ...overlay, afterSourceByPath: afterSources }, {
    before,
    after: current,
    beforeSources: new Map(Object.entries(beforeSources)),
    afterSources,
    lineDiffByPath: overlay.lineDiffByPath,
  });
}

interface WorkingSourceInput {
  graph: ProjectGraph;
  client: AnalysisClient;
  root: string;
  paths: string[];
}

async function readWorkingSources(input: WorkingSourceInput) {
  const { graph, client, root, paths } = input;
  const reads = knownPaths(graph, paths).map(async (path) => {
    const source = await client.readModuleSource(root, path);
    return [path, source] as const;
  });
  return new Map(await Promise.all(reads));
}

function knownPaths(graph: ProjectGraph, paths: readonly string[]) {
  const modulePaths = new Set(graph.modules.map((module) => module.path));
  return paths.filter((path) => modulePaths.has(path));
}
