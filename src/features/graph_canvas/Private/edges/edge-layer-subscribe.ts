// @Architecture(descriptionShort="Store subscription helpers for the edge layer")
import type { ViewportInput } from "./edge-viewport";

export interface EdgeLayerStoreSlice {
  domNode: HTMLElement | null;
  nodes: unknown;
  nodesInitialized: boolean;
  transform: readonly [number, number, number];
  width: number;
  height: number;
}

export function geometryDirty(
  state: EdgeLayerStoreSlice,
  prev: EdgeLayerStoreSlice,
): boolean {
  return (
    state.domNode !== prev.domNode ||
    state.nodes !== prev.nodes ||
    state.nodesInitialized !== prev.nodesInitialized
  );
}

export function viewportDirty(
  state: EdgeLayerStoreSlice,
  prev: EdgeLayerStoreSlice,
): boolean {
  return (
    state.transform !== prev.transform ||
    state.width !== prev.width ||
    state.height !== prev.height
  );
}

export function readViewport(state: EdgeLayerStoreSlice): ViewportInput {
  return {
    transform: state.transform,
    width: state.width,
    height: state.height,
  };
}

interface EdgeLayerCallbacks {
  onGeometryDirty: () => void;
  onViewportDirty: (input: ViewportInput) => void;
}

type EdgeLayerStoreApi = {
  subscribe: (
    listener: (state: EdgeLayerStoreSlice, prev: EdgeLayerStoreSlice) => void,
  ) => () => void;
};

export function subscribeEdgeLayer(
  storeApi: EdgeLayerStoreApi,
  callbacks: EdgeLayerCallbacks,
): () => void {
  return storeApi.subscribe((state, prev) => {
    if (geometryDirty(state, prev)) {
      callbacks.onGeometryDirty();
      return;
    }
    if (viewportDirty(state, prev)) {
      callbacks.onViewportDirty(readViewport(state));
    }
  });
}
