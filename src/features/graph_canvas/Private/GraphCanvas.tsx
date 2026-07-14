// @Architecture(descriptionShort="Main React Flow canvas rendering modules, groups, and edges")
import { useEffect, useMemo, useState, useRef } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  type FitViewOptions,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./graph-canvas.css";
import { L0_ZOOM_BOUNDARY, projectGraph } from "../../../domain/graph";
import { applyDiffOverlay } from "../../../domain/diff";
import type { RFNode, RenderOptions, ZoomLevel } from "../../../domain/graph";
import { edgeFocusForSelection, computeHeatProjection, isTestModule } from "../../../domain/graph";
import { GraphSessionStore, useGraphSession } from "../../../state/graph-session";
import { DiffModal, DiffOverlayBar } from "../../diff_visualizer";
import type { GitClient } from "../../../ipc/git-client";
import type { ShellClient } from "../../../ipc/shell-client";
import { ModuleContextMenu, type ModuleContextMenuState } from "./ModuleContextMenu";
import { nodeTypes } from "./node-types";
import { EdgeLayer } from "./EdgeLayer";
import { useStyledEdges } from "./use-styled-edges";
import { FitView } from "./FitView";
import { FocusNode } from "./FocusNode";
import { CANVAS_MIN_ZOOM } from "./use-zoom-counter-scale";
import { GraphCanvasController } from "./graph-canvas-controller";
import { usePreviewFrames } from "./preview_frames";
import { LevelBadge } from "./LevelBadge";
import { ViewControls } from "./ViewControls";
import { SelectionNavigation } from "./SelectionNavigation";
import type { ReviewNotesStore } from "../../../state/review-notes";
import { moduleIdsInGroupTree, type ProjectedGraph } from "../../../domain/graph";

interface GraphCanvasProps {
  store: GraphSessionStore;
  git: GitClient;
  shell: ShellClient;
  reviewNotes?: ReviewNotesStore;
  onShowReviewNotes?: () => void;
}

function fitOptionsForLevel(level: ZoomLevel): FitViewOptions {
  if (level === 0) return { padding: 0.18, maxZoom: L0_ZOOM_BOUNDARY };
  return { padding: 0.12 };
}

export function GraphCanvas({ store, git, shell, reviewNotes, onShowReviewNotes }: GraphCanvasProps) {
  const session = useGraphSession(store);
  const graph = session.getReducedGraph();
  const heatGraph = session.getGraph();
  const layout = session.getLayout();
  const level = session.getZoomLevel();
  const selectedId = session.getSelectedId();
  const edgeFocus = useMemo(
    () => (graph ? edgeFocusForSelection(graph, selectedId) : null),
    [graph, selectedId],
  );
  const diffOverlay = session.getDiffOverlay();
  const hideTests = session.getHideTests();
  const heatmapEnabled = session.getHeatmapEnabled();
  const heatmapMode = session.getHeatmapMode();
  const heatmapGitAvailable = session.getIsGitRepo() === true;
  const heatmapLoading = session.getPhase() === "loading";
  const [diffModalOpen, setDiffModalOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ModuleContextMenuState | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const previews = usePreviewFrames({ store, graph, diffOverlay, containerRef });
  const { openReviewNotePreview } = previews;
  const navigation = reviewNotes?.getNavigationRequest();
  useEffect(() => {
    if (navigation) void openReviewNotePreview(navigation);
  }, [navigation, openReviewNotePreview]);

  const controller = useMemo(
    /*build controller*/ () => new GraphCanvasController(store, previews.openFromSymbolNode, (node) => {
      if (!reviewNotes) return;
      if (node.type === "module") reviewNotes.filterModule(node.id);
      if (node.type === "group") reviewNotes.filterGroup(node.id);
      onShowReviewNotes?.();
    }),
    [store, previews.openFromSymbolNode, reviewNotes, onShowReviewNotes],
  );

  const cacheVersion = session.getSourceCacheVersion();
  const groupDocCacheVersion = session.getGroupDocCacheVersion();
  const heatOptions = useMemo(() => {
    if (!heatGraph || !heatmapEnabled || diffOverlay) return undefined;
    const moduleIds = new Set(
      heatGraph.modules
        .filter((m) => !hideTests || !isTestModule(m.path))
        .map((m) => m.id),
    );
    const projection = computeHeatProjection(heatGraph, heatmapMode, moduleIds);
    return { ...projection, mode: heatmapMode };
  }, [heatGraph, heatmapEnabled, heatmapMode, hideTests, diffOverlay]);

  const projected = useMemo(
    /*reproject on model/zoom change*/ () => {
      if (!graph || !layout) return null;
      const options: RenderOptions = {
        collapsedGroupIds: session.getCollapsedGroupIds(),
        disconnectedGroupIds: session.getDisconnectedGroupIds(),
        disconnectedModuleIds: session.getDisconnectedModuleIds(),
        showSymbols: level >= 1.5,
        snippets: level === 2 ? session.getSourceCache() : undefined,
        groupDocs: level === 2 ? session.getGroupDocCache() : undefined,
        heat: heatOptions,
      };
      // cacheVersion busts memo when L2 caches update without session identity change
      void cacheVersion;
      void groupDocCacheVersion;
      return projectGraph(graph, layout, options);
    },
    [graph, layout, level, session, cacheVersion, groupDocCacheVersion, heatOptions],
  );

  const displayProjected = useMemo(() => {
    if (!projected) return null;
    const diffed = diffOverlay ? applyDiffOverlay(projected, diffOverlay) : projected;
    return reviewNotes ? withReviewCounts(diffed, heatGraph, reviewNotes) : diffed;
  }, [projected, diffOverlay, reviewNotes, heatGraph]);

  const styledEdges = useStyledEdges(displayProjected, edgeFocus);

  if (!displayProjected) return null;

  const nodes: RFNode[] = displayProjected.nodes.map((n) => ({
    ...n,
    selected: n.id === selectedId,
  }));
  const fitOptions = fitOptionsForLevel(level);

  return (
    <ReactFlowProvider>
      <div ref={containerRef} style={{ position: "relative", width: "100%", height: "100%" }}>
        <ReactFlow
          nodes={nodes}
          edges={[]}
          nodeTypes={nodeTypes}
          colorMode="light"
          onNodeClick={(e, node) => controller.onNodeClick(node, e)}
          onNodeDoubleClick={(_e, node) => controller.onNodeDoubleClick(node)}
          onNodeContextMenu={(e, node) => {
            e.preventDefault();
            if ((e.target as HTMLElement).closest("[data-connection-toggle]")) return;
            const target = controller.moduleForContextMenu(node);
            if (!target) return;
            setContextMenu({ x: e.clientX, y: e.clientY, ...target });
          }}
          onPaneClick={() => {
            controller.onPaneClick();
            setContextMenu(null);
          }}
          onMoveStart={() => previews.closeAll()}
          onMove={(_e, viewport) => controller.onViewportZoom(viewport.zoom)}
          onMoveEnd={(_e, viewport) => controller.onViewportZoom(viewport.zoom)}
          fitView
          fitViewOptions={fitOptions}
          minZoom={CANVAS_MIN_ZOOM}
          maxZoom={12}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          style={{ background: "#ffffff" }}
        >
          <FitView options={fitOptions} />
          <FocusNode store={store} />
          <EdgeLayer edges={styledEdges} nodes={nodes} />
          <Background color="#e2e8f0" gap={20} />
          <Controls showInteractive={false} />
        </ReactFlow>
        <LevelBadge level={level} />
        <SelectionNavigation store={store} />
        {diffOverlay && (
          <DiffOverlayBar onStop={() => store.clearDiffOverlay()} />
        )}
        <ViewControls
          hideTests={hideTests}
          onHideTestsChange={(hide) => store.setHideTests(hide)}
          diffActive={!!diffOverlay}
          onVisualizeDiff={() => setDiffModalOpen(true)}
          heatmapEnabled={heatmapEnabled}
          heatmapMode={heatmapMode}
          heatmapGitAvailable={heatmapGitAvailable}
          heatmapLoading={heatmapLoading}
          onHeatmapEnabledChange={(enabled) => store.setHeatmapEnabled(enabled)}
          onHeatmapModeChange={(mode) => store.setHeatmapMode(mode)}
        />
        <DiffModal
          store={store}
          git={git}
          open={diffModalOpen}
          onClose={() => setDiffModalOpen(false)}
        />
        <ModuleContextMenu
          menu={contextMenu}
          projectRoot={session.getProjectRoot()}
          shell={shell}
          onOpenPreview={previews.openDocumentPreview}
          onClose={() => setContextMenu(null)}
        />
        {previews.framesView}
      </div>
    </ReactFlowProvider>
  );
}

function withReviewCounts(projected: ProjectedGraph, graph: ReturnType<GraphSessionStore["getGraph"]>, notes: ReviewNotesStore): ProjectedGraph {
  if (!graph) return projected;
  return {
    ...projected,
    nodes: projected.nodes.map((node) => {
      if (node.type === "module") {
        const count = notes.countForModule(node.id);
        return count ? { ...node, data: { ...node.data, reviewNoteCount: count } } : node;
      }
      if (node.type === "group") {
        const count = [...moduleIdsInGroupTree(graph, node.id)].reduce((total, id) => total + notes.countForModule(id), 0);
        return count ? { ...node, data: { ...node.data, reviewNoteCount: count } } : node;
      }
      return node;
    }),
  };
}
