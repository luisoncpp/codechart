// @Architecture(descriptionShort="Main React Flow canvas rendering modules, groups, and edges")
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  type FitViewOptions,
  type Node as FlowNode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./graph-canvas.css";
import { projectGraph } from "../../../domain/graph";
import type { RFNode, RenderOptions, ZoomLevel } from "../../../domain/graph";
import { GraphSessionStore, useGraphSession } from "../../../state/graph-session";
import { nodeTypes } from "./node-types";
import { edgeTypes } from "./edge-types";
import { styleEdge } from "./edge-style";
import { FitView } from "./FitView";
import { CANVAS_MIN_ZOOM } from "./use-zoom-counter-scale";
import { GraphCanvasController } from "./graph-canvas-controller";
import { SymbolSourceWidget } from "./SymbolSourceWidget";
import { LevelBadge } from "./LevelBadge";
import { ViewControls } from "./ViewControls";

interface GraphCanvasProps {
  store: GraphSessionStore;
}

function fitOptionsForLevel(level: ZoomLevel): FitViewOptions {
  if (level === 0) return { padding: 0.18, maxZoom: 0.45 };
  return { padding: 0.12 };
}

function computeWidgetPosition(
  symbolRect: DOMRect,
  containerRect: DOMRect,
): { top: number; left: number } {
  const widgetWidth = 400;
  const widgetHeight = 300;
  const spacing = 8;

  let left = symbolRect.right - containerRect.left + spacing;
  if (left + widgetWidth > containerRect.width && symbolRect.left - containerRect.left > widgetWidth) {
    left = symbolRect.left - containerRect.left - widgetWidth - spacing;
  }

  let top = symbolRect.top - containerRect.top;
  if (top + widgetHeight > containerRect.height) {
    top = containerRect.height - widgetHeight - spacing;
  }
  if (top < spacing) top = spacing;

  return { top, left };
}

export function GraphCanvas({ store }: GraphCanvasProps) {
  const session = useGraphSession(store);
  const graph = session.getReducedGraph();
  const layout = session.getLayout();
  const level = session.getZoomLevel();
  const selectedId = session.getSelectedId();

  const containerRef = useRef<HTMLDivElement>(null);
  const [activeSymbol, setActiveSymbol] = useState<{
    symbolName: string;
    modulePath: string;
    sourceText: string;
    top: number;
    left: number;
    parentId: string;
  } | null>(null);

  const handleSymbolClick = useCallback(
    async (node: FlowNode, event: React.MouseEvent) => {
      const symbolEl =
        (event.target as HTMLElement).closest(".symbol-box") ||
        (event.target as HTMLElement).closest(".react-flow__node-symbol");
      const container = containerRef.current;
      if (!symbolEl || !container || !graph) return;
      const moduleId = node.parentId!;
      const module = graph.modules.find((m) => m.id === moduleId);
      if (!module) return;
      const sourceText = await store.fetchModuleSource(moduleId);
      const { top, left } = computeWidgetPosition(
        symbolEl.getBoundingClientRect(),
        container.getBoundingClientRect(),
      );
      setActiveSymbol({
        symbolName: (node.data?.label as string) || "",
        modulePath: module.path,
        sourceText,
        top,
        left,
        parentId: moduleId,
      });
    },
    [graph, store],
  );

  const controller = useMemo(
    /*build controller*/ () => new GraphCanvasController(store, handleSymbolClick),
    [store, handleSymbolClick],
  );

  useEffect(() => {
    if (selectedId === null || (activeSymbol && activeSymbol.parentId !== selectedId)) {
      setActiveSymbol(null);
    }
  }, [selectedId, activeSymbol]);

  useEffect(() => {
    if (!activeSymbol) return;
    const handler = (e: MouseEvent) => {
      const widget = document.querySelector(".symbol-widget");
      if (widget?.contains(e.target as globalThis.Node)) return;
      setActiveSymbol(null);
    };
    const timer = setTimeout(() => {
      document.addEventListener("click", handler);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handler);
    };
  }, [activeSymbol]);

  const cacheVersion = session.getSourceCacheVersion();
  const projected = useMemo(
    /*reproject on model/zoom change*/ () => {
      if (!graph || !layout) return null;
      const options: RenderOptions = {
        collapsedGroupIds: session.getCollapsedGroupIds(),
        disconnectedGroupIds: session.getDisconnectedGroupIds(),
        disconnectedModuleIds: session.getDisconnectedModuleIds(),
        showSymbols: level >= 1.5,
        snippets: level === 2 ? session.getSourceCache() : undefined,
      };
      // cacheVersion busts memo when source cache updates without session identity change
      void cacheVersion;
      return projectGraph(graph, layout, options);
    },
    [graph, layout, level, session, cacheVersion],
  );

  if (!projected) return null;

  const nodes: RFNode[] = projected.nodes.map((n) => ({
    ...n,
    selected: n.id === selectedId,
  }));
  const edges = projected.edges.map((e) => styleEdge(e, selectedId));
  const fitOptions = fitOptionsForLevel(level);

  return (
    <ReactFlowProvider>
      <div ref={containerRef} style={{ position: "relative", width: "100%", height: "100%" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          colorMode="light"
          onNodeClick={(e, node) => controller.onNodeClick(node, e)}
          onNodeDoubleClick={(_e, node) => controller.onNodeDoubleClick(node)}
          onPaneClick={() => controller.onPaneClick()}
          onMoveStart={() => setActiveSymbol(null)}
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
          <Background color="#e2e8f0" gap={20} />
          <Controls showInteractive={false} />
        </ReactFlow>
        <LevelBadge level={level} />
        <ViewControls
          hideTests={session.getHideTests()}
          onHideTestsChange={(hide) => store.setHideTests(hide)}
        />
        {activeSymbol && (
          <SymbolSourceWidget
            symbolName={activeSymbol.symbolName}
            modulePath={activeSymbol.modulePath}
            sourceText={activeSymbol.sourceText}
            top={activeSymbol.top}
            left={activeSymbol.left}
            onClose={() => setActiveSymbol(null)}
          />
        )}
      </div>
    </ReactFlowProvider>
  );
}
