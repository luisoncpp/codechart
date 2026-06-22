// @Architecture(descriptionShort="Applies strokes, patterns, and colors to visual edges")
import { MarkerType } from "@xyflow/react";
import type { RFEdgeT } from "../../../domain/graph";

export type EdgeRole = "import" | "export" | "violation" | "neutral";

const COLOR: Record<EdgeRole, string> = {
  import: "#ea580c", // orange — the selected module's outgoing imports
  export: "#2563eb",
  violation: "#dc2626", // red — reserved for facade-bypass violations
  neutral: "#94a3b8",
};

/** An edge's role relative to the selected node (module or collapsed group). */
export function edgeRole(edge: RFEdgeT, selectedId: string | null): EdgeRole {
  if (selectedId && edge.source === selectedId) return "import"; // outgoing from selection
  if (selectedId && edge.target === selectedId) return "export"; // incoming to selection
  if (edge.data?.isViolation) return "violation";
  return "neutral";
}

/**
 * Single-level focus dimming: the selected module's own edges stay opaque; every
 * other edge sits at one quiet level — whether or not a selection is active — so
 * context stays legible instead of nearly disappearing.
 */
export function edgeOpacity(role: EdgeRole): number {
  return role === "neutral" ? 0.45 : 1;
}

/** Apply the sample's edge aesthetic + focus dimming (floating routing).
 *  Soft (event/runtime) edges render dashed; direction color still applies. */
export function styleEdge(edge: RFEdgeT, selectedId: string | null): RFEdgeT {
  const role = edgeRole(edge, selectedId);
  const color = COLOR[role];
  const focused = role !== "neutral";
  const dashed = edge.data?.kind === "soft";
  return {
    ...edge,
    type: "floating",
    markerEnd: { type: MarkerType.ArrowClosed, color, width: 14, height: 14 },
    style: {
      stroke: color,
      strokeWidth: focused ? 2 : 1.2,
      opacity: edgeOpacity(role),
      ...(dashed ? { strokeDasharray: "6 4" } : {}),
    },
  };
}
