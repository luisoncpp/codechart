import { useMemo } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  type FitViewOptions,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./graph-canvas.css";
import {
  projectGraph,
  type RFNode,
  type RenderOptions,
  type ZoomLevel,
} from "../../../domain/graph";
import { GraphSessionStore, useGraphSession } from "../../../state/graph-session";
import { nodeTypes } from "./node-types";
import { edgeTypes } from "./edge-types";
import { styleEdge } from "./edge-style";
import { FitView } from "./FitView";
import { GraphCanvasController } from "./graph-canvas-controller";

interface GraphCanvasProps {
  store: GraphSessionStore;
}

/** Initial fit only — camera zoom is free after load (Google Maps style). */
function fitOptionsForLevel(level: ZoomLevel): FitViewOptions {
  if (level === 0) return { padding: 0.18, maxZoom: 0.45 };
  return { padding: 0.12 };
}

export function GraphCanvas({ store }: GraphCanvasProps) {
  const session = useGraphSession(store);
  const graph = session.getReducedGraph();
  const layout = session.getLayout();
  const level = session.getZoomLevel();
  const selectedId = session.getSelectedId();
  const controller = useMemo(
    /*build controller*/ () => new GraphCanvasController(store),
    [store],
  );

  const projected = useMemo(
    /*reproject on model/zoom change*/ () => {
      if (!graph || !layout) return null;
      const options: RenderOptions = {
        collapsedGroupIds: session.getCollapsedGroupIds(),
        showSymbols: level >= 1.5,
        snippets: level === 2 ? session.getSourceCache() : undefined,
      };
      return projectGraph(graph, layout, options);
    },
    [graph, layout, level, session],
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
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          colorMode="light"
          onNodeClick={(e, node) => controller.onNodeClick(node, e)}
          onNodeDoubleClick={(_e, node) => controller.onNodeDoubleClick(node)}
          onPaneClick={() => controller.onPaneClick()}
          onMoveEnd={(_e, viewport) => controller.onViewportZoom(viewport.zoom)}
          fitView
          fitViewOptions={fitOptions}
          minZoom={0.15}
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
      </div>
    </ReactFlowProvider>
  );
}

const LABEL: Record<ZoomLevel, string> = {
  0: "L0 · overview",
  1: "L1 · modules",
  1.5: "L1.5 · symbols",
  2: "L2 · source",
};

/** Read-out of the active semantic-zoom level (driven by scroll). */
function LevelBadge({ level }: { level: ZoomLevel }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 10,
        right: 10,
        padding: "3px 8px",
        fontSize: 11,
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        fontWeight: 600,
        color: "#475569",
        background: "#ffffffcc",
        border: "1px solid #e2e8f0",
        borderRadius: 6,
        pointerEvents: "none",
      }}
    >
      {LABEL[level]}
    </div>
  );
}
