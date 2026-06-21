import { useEffect, useRef } from "react";
import {
  useNodesInitialized,
  useReactFlow,
  type FitViewOptions,
} from "@xyflow/react";

/**
 * React Flow's `fitView` prop fits before nodes are measured in some hosts
 * (embedded webviews). This refits once, when measurement first completes.
 *
 * It deliberately does NOT refit on zoom-level changes: the level is driven by
 * the scroll zoom factor, so a programmatic refit would change the zoom and feed
 * back into another level change (L0 → fit → L2 oscillation). GraphCanvas remounts
 * per project load (App renders it only when `ready`), so once-per-mount = per-load.
 */
export function FitView({ options }: { options: FitViewOptions }) {
  const initialized = useNodesInitialized();
  const { fitView } = useReactFlow();
  const fitted = useRef(false);

  useEffect(() => {
    if (!initialized || fitted.current) return;
    fitted.current = true;
    fitView(options);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, fitView]);

  return null;
}
