// @Architecture(descriptionShort="Single SVG layer that draws all graph edges")
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useStoreApi } from "@xyflow/react";
import type { RFEdgeT, RFNode } from "../../../../domain/graph";
import type { BucketDomRefs } from "./edge-layer-dom-writer";
import {
  EdgeLayerController,
  type EdgeLayerControllerDeps,
} from "./edge-layer-controller";
import { subscribeEdgeLayer } from "./edge-layer-subscribe";
import { EdgeBucketSvg } from "./EdgeBucketSvg";
import { styleKeyFromDrawStyle } from "./edge-path";
import type { ViewportEdgeModel } from "./viewport-edge-model";

interface EdgeLayerProps {
  edges: RFEdgeT[];
  nodes: RFNode[];
}

function EdgeLayerSvg({
  model,
  onRefs,
}: {
  model: ViewportEdgeModel;
  onRefs: (key: string, refs: BucketDomRefs | null) => void;
}) {
  return (
    <svg className="codechart-edge-layer" aria-hidden>
      {model.buckets.map((bucket) => (
        <EdgeBucketSvg
          key={styleKeyFromDrawStyle(bucket.style)}
          bucket={bucket}
          showArrows={model.showArrows}
          onRefs={onRefs}
        />
      ))}
    </svg>
  );
}

function useEdgeLayerController(deps: EdgeLayerControllerDeps): EdgeLayerController {
  const controllerRef = useRef<EdgeLayerController | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = new EdgeLayerController(deps);
  }
  return controllerRef.current;
}

function bindEdgeLayer(
  controller: EdgeLayerController,
  storeApi: EdgeLayerControllerDeps["storeApi"],
): () => void {
  const rebuild = () => controller.rebuildFromGeometry();
  rebuild();
  const raf = requestAnimationFrame(/*rebuildAfterLayout*/ rebuild);
  const unsub = subscribeEdgeLayer(storeApi, {
    onGeometryDirty: rebuild,
    onViewportDirty: (input) => controller.scheduleArrowLodCheck(input),
  });
  return () => {
    cancelAnimationFrame(raf);
    unsub();
    controller.dispose();
  };
}

export function EdgeLayer({ edges, nodes }: EdgeLayerProps) {
  const storeApi = useStoreApi();
  const edgesRef = useRef(edges);
  const nodesRef = useRef(nodes);
  edgesRef.current = edges;
  nodesRef.current = nodes;

  const [edgesRoot, setEdgesRoot] = useState<Element | null>(null);
  const [model, setModel] = useState<ViewportEdgeModel | null>(null);
  const controller = useEdgeLayerController({
    storeApi,
    onViewportModel: setModel,
    onEdgesRoot: setEdgesRoot,
    getEdges: () => edgesRef.current,
    getNodes: () => nodesRef.current,
  });

  const onRefs = useCallback((key: string, refs: BucketDomRefs | null) => {
    controller.setBucketRefs(key, refs);
  }, [controller]);

  useEffect(/*bindStore*/ () => bindEdgeLayer(controller, storeApi), [storeApi, controller]);
  useEffect(/*rebuildOnGraphChange*/ () => {
    controller.rebuildFromGeometry();
  }, [edges, nodes, controller]);

  if (!edgesRoot || !model) return null;

  return createPortal(<EdgeLayerSvg model={model} onRefs={onRefs} />, edgesRoot);
}
