// @Architecture(descriptionShort="Main React Flow canvas rendering modules, groups, and edges")
import { useMemo, useState, useRef } from "react";
import { ReactFlow, ReactFlowProvider, Background, Controls } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./graph-canvas.css";
import { projectGraph } from "../../../domain/graph";
import { applyDiffOverlay } from "../../../domain/diff";
import type { RFNode, RenderOptions } from "../../../domain/graph";
import { edgeFocusForSelection, computeHeatProjection, isTestModule } from "../../../domain/graph";
import { GraphSessionStore, useGraphSession } from "../../../state/graph-session";
import { DiffModal, DiffOverlayBar } from "../../diff_visualizer";
import type { GitClient } from "../../../ipc/git-client";
import type { ShellClient } from "../../../ipc/shell-client";
import { ModuleContextMenu, type ModuleContextMenuState } from "./toolbar/ModuleContextMenu";
import { nodeTypes } from "./nodes/node-types";
import { EdgeLayer } from "./edges/EdgeLayer";
import { useStyledEdges } from "./edges/use-styled-edges";
import { FitView } from "./navigation/FitView";
import { fitOptionsForLevel } from "./navigation/fit-options";
import { FocusNode } from "./navigation/FocusNode";
import { CANVAS_MIN_ZOOM } from "./nodes/use-zoom-counter-scale";
import { GraphCanvasController } from "./controller/graph-canvas-controller";
import { usePreviewFrames } from "./preview_frames";
import { ProjectSearch } from "./project_search";
import { ProgrammaticMoveGuard } from "./navigation/programmatic-move-guard";
import { LevelBadge } from "./toolbar/LevelBadge";
import { HeatmapLegend } from "./toolbar/HeatmapLegend";
import { CanvasUiState, useCanvasUiState } from "./controller/canvas-ui-state";
import { SelectionNavigation } from "./toolbar/SelectionNavigation";
import type { ReviewNotesStore } from "../../../state/review-notes";
import { useReviewNoteNavigation, withReviewCounts } from "./review-note-canvas";

interface GraphCanvasProps {
  store: GraphSessionStore;
  git: GitClient;
  shell: ShellClient;
  ui: CanvasUiState;
  reviewNotes?: ReviewNotesStore;
  onShowReviewNotes?: () => void;
}

export function GraphCanvas({ store, git, shell, ui, reviewNotes, onShowReviewNotes }: GraphCanvasProps) {
  const session = useGraphSession(store);
  const uiState = useCanvasUiState(ui);
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
  const [contextMenu, setContextMenu] = useState<ModuleContextMenuState | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const previews = usePreviewFrames({
    store, graph, diffOverlay, containerRef, getFindQuery: () => ui.getFindQuery(),
  });
  const moveGuard = useRef(new ProgrammaticMoveGuard()).current;
  useReviewNoteNavigation({
    store, notes: reviewNotes, openPreview: previews.openReviewNotePreview, guard: moveGuard,
  });

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
  const reviewNotesDocument = reviewNotes?.getDocument();
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
    // The store identity is stable; its immutable document invalidates badge counts.
    void reviewNotesDocument;
    return reviewNotes ? withReviewCounts(diffed, heatGraph, reviewNotes) : diffed;
  }, [projected, diffOverlay, reviewNotes, reviewNotesDocument, heatGraph]);

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
          onMoveStart={(event) => {
            if (moveGuard.shouldClosePreview(event)) previews.closeAll();
          }}
          onMove={(_e, viewport) => controller.onViewportZoom(viewport.zoom)}
          onMoveEnd={(_e, viewport) => {
            moveGuard.finishMove();
            controller.onViewportZoom(viewport.zoom);
          }}
          fitView
          fitViewOptions={fitOptions}
          onlyRenderVisibleElements
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
        {heatmapEnabled && heatmapGitAvailable && !heatmapLoading && !diffOverlay && (
          <HeatmapLegend mode={heatmapMode} />
        )}
        <DiffModal
          store={store}
          git={git}
          open={uiState.getDiffModalOpen()}
          onClose={() => ui.setDiffModalOpen(/*open=*/false)}
        />
        <ModuleContextMenu
          menu={contextMenu}
          projectRoot={session.getProjectRoot()}
          shell={shell}
          onOpenPreview={previews.openDocumentPreview}
          onClose={() => setContextMenu(null)}
        />
        {previews.framesView}
        <ProjectSearch
          deps={{ store, moveGuard }}
          belowDiffBar={!!diffOverlay}
          open={uiState.getFindBarOpen()}
          mode={uiState.getFindBarMode()}
          onOpen={(mode) => ui.openFindBar(mode)}
          onClose={() => ui.setFindBarOpen(/*open=*/false)}
          onQueryChange={(query) => ui.setFindQuery(query)}
        />
      </div>
    </ReactFlowProvider>
  );
}
