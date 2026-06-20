import { useEffect } from "react";
import { useNodesInitialized, useReactFlow } from "@xyflow/react";

/**
 * React Flow's `fitView` prop fits before nodes are measured in some hosts
 * (embedded webviews). This refits once measurement completes.
 */
export function FitView({ revision }: { revision: number }) {
  const initialized = useNodesInitialized();
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (initialized) fitView({ padding: 0.12 });
  }, [initialized, revision, fitView]);

  return null;
}
