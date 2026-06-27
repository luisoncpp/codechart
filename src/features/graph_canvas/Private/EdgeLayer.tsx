// @Architecture(descriptionShort="Single SVG layer that draws all graph edges")
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useStoreApi } from "@xyflow/react";
import type { RFEdgeT, RFNode } from "../../../domain/graph";
import type { EdgeLayerModel } from "./edge-layer-cache";
import { ArrowMarker, EdgeBucketSvg } from "./EdgeBucketSvg";
import { EdgeLayerRenderer } from "./edge-layer-renderer";

interface EdgeLayerProps {
  edges: RFEdgeT[];
  nodes: RFNode[];
}

function EdgeLayerSvg({ model }: { model: EdgeLayerModel }) {
  return (
    <svg
      className="codechart-edge-layer"
      aria-hidden
    >
      <defs>
        {model.buckets.map((bucket, index) => (
          <ArrowMarker
            key={index}
            id={`codechart-arrow-${index}`}
            color={bucket.style.stroke}
          />
        ))}
      </defs>
      {model.buckets.map((bucket, index) => (
        <EdgeBucketSvg
          key={index}
          bucket={bucket}
          markerId={`codechart-arrow-${index}`}
        />
      ))}
    </svg>
  );
}

export function EdgeLayer({ edges, nodes }: EdgeLayerProps) {
  const storeApi = useStoreApi();
  const rendererRef = useRef(new EdgeLayerRenderer());
  const [edgesRoot, setEdgesRoot] = useState<Element | null>(null);
  const [model, setModel] = useState<EdgeLayerModel | null>(null);

  const rebuild = useCallback(() => {
    const root =
      storeApi.getState().domNode?.querySelector(".react-flow__edges") ?? null;
    setEdgesRoot(root);
    if (!root) return;

    rendererRef.current.setEdges(edges);
    setModel(
      rendererRef.current.rebuild(nodes, storeApi.getState().nodeLookup),
    );
  }, [edges, nodes, storeApi]);

  useEffect(() => {
    rebuild();
    const raf = requestAnimationFrame(rebuild);
    const unsub = storeApi.subscribe((state, prev) => {
      if (
        state.domNode !== prev.domNode ||
        state.nodes !== prev.nodes ||
        state.nodesInitialized !== prev.nodesInitialized
      ) {
        rebuild();
      }
    });
    return () => {
      cancelAnimationFrame(raf);
      unsub();
    };
  }, [rebuild, storeApi]);

  if (!edgesRoot || !model) return null;

  return createPortal(<EdgeLayerSvg model={model} />, edgesRoot);
}
