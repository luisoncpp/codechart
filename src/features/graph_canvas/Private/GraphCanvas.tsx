import { useMemo } from "react";
import { ReactFlow, ReactFlowProvider, Background, Controls } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { projectGraph, type RFNode } from "../../../domain/graph";
import { GraphSessionStore, useGraphSession } from "../../../state/graph-session";
import { nodeTypes } from "./node-types";
import { styleEdge } from "./edge-style";
import { FitView } from "./FitView";
import { GraphCanvasController } from "./graph-canvas-controller";

interface GraphCanvasProps {
  store: GraphSessionStore;
}

export function GraphCanvas({ store }: GraphCanvasProps) {
  const session = useGraphSession(store);
  const graph = session.getGraph();
  const layout = session.getLayout();
  const selectedId = session.getSelectedId();
  const controller = useMemo(
    /*build controller*/ () => new GraphCanvasController(store),
    [store],
  );

  const projected = useMemo(
    /*reproject on model change*/ () =>
      graph && layout ? projectGraph(graph, layout) : null,
    [graph, layout],
  );

  if (!projected) return null;

  const nodes: RFNode[] = projected.nodes.map((n) => ({
    ...n,
    selected: n.id === selectedId,
  }));
  const edges = projected.edges.map(styleEdge);

  return (
    <ReactFlowProvider>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        colorMode="light"
        onNodeClick={(_e, node) => controller.onNodeClick(node)}
        onPaneClick={() => controller.onPaneClick()}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        style={{ background: "#ffffff" }}
      >
        <FitView revision={projected.nodes.length} />
        <Background color="#e2e8f0" gap={20} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </ReactFlowProvider>
  );
}
