import {
  compareGraphs,
  overlayFromPastedDiff,
  attachLineDiff,
  attachSymbolDiff,
  attachRenames,
  mergeCommitOverlay,
  pathsFromUnifiedDiff,
  excludeSubmoduleModules,
  type GraphDiffOverlay,
} from "../../../domain/diff";
import type { ProjectGraph } from "../../../domain/graph";
import type { LayoutEngine } from "../../../domain/layout";
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
  const before = beforeSnapshot.graph;
  const after = afterSnapshot.graph;
  const overlay = await coreOverlay({ unifiedDiff, before, after, layoutEngine });
  return attachSymbolsAndRenames({
    overlay,
    before,
    after,
    beforeSources: new Map(Object.entries(beforeSnapshot.sources)),
    afterSources: new Map(Object.entries(afterSnapshot.sources)),
  });
}

export function buildPasteDiffOverlay(
  text: string,
  graph: ProjectGraph,
): GraphDiffOverlay {
  const partial = overlayFromPastedDiff(text, graph);
  const overlay = attachLineDiff({ ...partial, beforeLayout: null }, text);
  return attachRenames({ overlay, afterModules: graph.modules });
}

interface WorkingTreeDiffInput {
  client: AnalysisClient;
  git: GitClient;
  layoutEngine: LayoutEngine;
  root: string;
  baseRef: string;
  current: ProjectGraph;
  hideTopLevelDotDirs: boolean;
  ignoreSubmodules: boolean;
}

export async function buildWorkingTreeDiffOverlay(
  input: WorkingTreeDiffInput,
): Promise<GraphDiffOverlay> {
  const { unifiedDiff, before, after, snapshot } = await workingTreeGraphs(input);
  const overlay = await coreOverlay({
    unifiedDiff,
    before,
    after,
    layoutEngine: input.layoutEngine,
  });
  const afterSources = await readWorkingSources({
    graph: after,
    client: input.client,
    root: input.root,
    paths: [...overlay.lineDiffByPath.keys()],
  });
  return attachSymbolsAndRenames({
    overlay,
    before,
    after,
    beforeSources: new Map(Object.entries(snapshot.sources)),
    afterSources,
  });
}

async function workingTreeGraphs(input: WorkingTreeDiffInput) {
  const { git, root, baseRef, current, hideTopLevelDotDirs, ignoreSubmodules } = input;
  const [unifiedDiff, submoduleRoots] = await Promise.all([
    git.diffWorkingTree({
      path: root,
      baseRef,
      eligiblePaths: current.modules.map((module) => module.path),
      ignoreSubmodules,
    }),
    ignoreSubmodules ? git.listSubmodulePaths(root) : Promise.resolve([]),
  ]);
  const after = excludeSubmoduleModules(current, submoduleRoots);
  const snapshot = await git.loadProjectSnapshot({
    path: root,
    gitRef: baseRef,
    modulePaths: changedPaths(unifiedDiff),
    hideTopLevelDotDirs,
  });
  const before = excludeSubmoduleModules(snapshot.graph, submoduleRoots);
  return { unifiedDiff, before, after, snapshot };
}

interface CoreOverlayInput {
  unifiedDiff: string;
  before: ProjectGraph;
  after: ProjectGraph;
  layoutEngine: LayoutEngine;
}

async function coreOverlay(input: CoreOverlayInput): Promise<GraphDiffOverlay> {
  const pathOverlay = overlayFromPastedDiff(input.unifiedDiff, input.after);
  const graphOverlay = compareGraphs({ before: input.before, after: input.after });
  const partial = mergeCommitOverlay(pathOverlay, graphOverlay, input.before);
  const beforeLayout = await input.layoutEngine.layout(input.before);
  return attachLineDiff({ ...partial, beforeLayout }, input.unifiedDiff);
}

interface SymbolsAndRenamesInput {
  overlay: GraphDiffOverlay;
  before: ProjectGraph;
  after: ProjectGraph;
  beforeSources: ReadonlyMap<string, string>;
  afterSources: ReadonlyMap<string, string>;
}

function attachSymbolsAndRenames(input: SymbolsAndRenamesInput): GraphDiffOverlay {
  const withSymbols = attachSymbolDiff(
    { ...input.overlay, afterSourceByPath: input.afterSources },
    {
      before: input.before,
      after: input.after,
      beforeSources: input.beforeSources,
      afterSources: input.afterSources,
      lineDiffByPath: input.overlay.lineDiffByPath,
    },
  );
  return attachRenames({
    overlay: withSymbols,
    beforeModules: input.before.modules,
    afterModules: input.after.modules,
    beforeSources: input.beforeSources,
    afterSources: input.afterSources,
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
