import {
  compareGraphs,
  overlayFromPastedDiff,
  attachLineDiff,
  attachSymbolDiff,
  mergeCommitOverlay,
  pathsFromUnifiedDiff,
  type GraphDiffOverlay,
} from "../../../domain/diff";
import type { ProjectGraph } from "../../../domain/graph";
import { LayoutEngine } from "../../../domain/layout";
import type { AnalysisClient } from "../../../ipc/analysis-client";
import type { GitClient } from "../../../ipc/git-client";

interface CommitDiffInput {
  git: GitClient;
  layoutEngine: LayoutEngine;
  root: string;
  baseRef: string;
  headRef: string;
  hideTopLevelDotDirs: boolean;
}

export async function buildCommitDiffOverlay(
  input: CommitDiffInput,
): Promise<GraphDiffOverlay> {
  const { git, layoutEngine, root, baseRef, headRef, hideTopLevelDotDirs } = input;
  const unifiedDiff = await git.diffRefs(root, baseRef, headRef);
  const modulePaths = changedPaths(unifiedDiff);
  const [beforeSnapshot, afterSnapshot] = await Promise.all([
    git.loadProjectSnapshot({ path: root, gitRef: baseRef, modulePaths, hideTopLevelDotDirs }),
    git.loadProjectSnapshot({ path: root, gitRef: headRef, modulePaths, hideTopLevelDotDirs }),
  ]);
  const { graph: before, sources: beforeSources } = beforeSnapshot;
  const { graph: after, sources: afterSources } = afterSnapshot;
  const pathOverlay = overlayFromPastedDiff(unifiedDiff, after);
  const graphOverlay = compareGraphs({ before, after });
  const partial = mergeCommitOverlay(pathOverlay, graphOverlay, before);
  const beforeLayout = await layoutEngine.layout(before);
  const overlay = attachLineDiff({ ...partial, beforeLayout }, unifiedDiff);
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
  hideTopLevelDotDirs: boolean;
}

export async function buildWorkingTreeDiffOverlay(input: WorkingTreeDiffInput): Promise<GraphDiffOverlay> {
  const { git, layoutEngine, root, baseRef, current, hideTopLevelDotDirs } = input;
  const unifiedDiff = await git.diffWorkingTree(
    root,
    baseRef,
    current.modules.map((module) => module.path),
  );
  const modulePaths = changedPaths(unifiedDiff);
  const snapshot = await git.loadProjectSnapshot({
    path: root,
    gitRef: baseRef,
    modulePaths,
    hideTopLevelDotDirs,
  });
  const { graph: before, sources: beforeSources } = snapshot;
  const pathOverlay = overlayFromPastedDiff(unifiedDiff, current);
  const graphOverlay = compareGraphs({ before, after: current });
  const partial = mergeCommitOverlay(pathOverlay, graphOverlay, before);
  const beforeLayout = await layoutEngine.layout(before);
  const overlay = attachLineDiff({ ...partial, beforeLayout }, unifiedDiff);
  const afterSources = await readWorkingSources({
    graph: current,
    client: input.client,
    root,
    paths: [...overlay.lineDiffByPath.keys()],
  });
  return attachSymbolDiff({ ...overlay, afterSourceByPath: afterSources }, {
    before,
    after: current,
    beforeSources: new Map(Object.entries(beforeSources)),
    afterSources,
    lineDiffByPath: overlay.lineDiffByPath,
  });
}

function changedPaths(unifiedDiff: string): string[] {
  const paths = pathsFromUnifiedDiff(unifiedDiff);
  return [...new Set([...paths.modified, ...paths.deleted, ...paths.added])];
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
