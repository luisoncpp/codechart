// @Architecture(descriptionShort="Exposes React Flow viewport controls for dev playtesting")
import { useEffect } from "react";
import { useReactFlow } from "@xyflow/react";

export interface CanvasViewportHandle {
  getViewport(): { x: number; y: number; zoom: number };
  setViewport(
    viewport: { x: number; y: number; zoom: number },
    options?: { duration?: number },
  ): Promise<boolean>;
  fitView(options?: { padding?: number; duration?: number }): Promise<boolean>;
}

interface ViewportBridgeProps {
  onReady?: (handle: CanvasViewportHandle | null) => void;
}

/** Publishes imperative viewport methods without leaking React Flow outside graph_canvas. */
export function ViewportBridge({ onReady }: ViewportBridgeProps) {
  const { getViewport, setViewport, fitView } = useReactFlow();

  useEffect(() => {
    if (!onReady) return;
    onReady({
      getViewport,
      setViewport: (viewport, options) => setViewport(viewport, options),
      fitView: (options) => fitView(options),
    });
    return () => onReady(null);
  }, [onReady, getViewport, setViewport, fitView]);

  return null;
}
