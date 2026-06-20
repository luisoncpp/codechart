import { MarkerType } from "@xyflow/react";
import type { RFEdgeT } from "../../../domain/graph";

export type EdgeRole = "import" | "export" | "violation" | "neutral";

const COLOR: Record<EdgeRole, string> = {
  import: "#dc2626",
  export: "#2563eb",
  violation: "#dc2626",
  neutral: "#94a3b8",
};

/** An edge's role relative to the selected module (selection wins over violation). */
export function edgeRole(edge: RFEdgeT, selectedId: string | null): EdgeRole {
  if (selectedId && edge.source === selectedId) return "import"; // selected imports target
  if (selectedId && edge.target === selectedId) return "export"; // target imports selected
  if (edge.data?.isViolation) return "violation";
  return "neutral";
}

/** Apply the sample's edge aesthetic: solid arrows, selection-aware import/export coloring. */
export function styleEdge(edge: RFEdgeT, selectedId: string | null): RFEdgeT {
  const role = edgeRole(edge, selectedId);
  const color = COLOR[role];
  return {
    ...edge,
    markerEnd: { type: MarkerType.ArrowClosed, color, width: 14, height: 14 },
    style: { stroke: color, strokeWidth: role === "neutral" ? 1.5 : 2 },
  };
}
