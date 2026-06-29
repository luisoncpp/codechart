// @Architecture(descriptionShort="Applies strokes, patterns, and colors to visual edges")
import { MarkerType } from "@xyflow/react";
import type { EdgeFocus, RFEdgeT } from "../../../domain/graph";

export type EdgeRole = "import" | "export" | "violation" | "neutral" | "diff-added" | "diff-removed";

const COLOR: Record<EdgeRole, string> = {
  import: "#ea580c",
  export: "#2563eb",
  violation: "#dc2626",
  neutral: "#94a3b8",
  "diff-added": "#16a34a",
  "diff-removed": "#dc2626",
};

/** An edge's role relative to the selected node (module or group). */
export function edgeRole(edge: RFEdgeT, focus: EdgeFocus | null): EdgeRole {
  if (edge.data?.diffState === "added") return "diff-added";
  if (edge.data?.diffState === "removed") return "diff-removed";
  const role = roleForFocus(edge, focus);
  if (role) return role;
  if (edge.data?.isViolation) return "violation";
  return "neutral";
}

function roleForFocus(edge: RFEdgeT, focus: EdgeFocus | null): EdgeRole | null {
  if (!focus) return null;
  if (typeof focus === "string") {
    if (edge.source === focus) return "import";
    if (edge.target === focus) return "export";
    return null;
  }
  if (edge.source === focus.groupId) return "import";
  if (edge.target === focus.groupId) return "export";
  if (focus.moduleIds.has(edge.source)) return "import";
  if (focus.moduleIds.has(edge.target)) return "export";
  return null;
}

/**
 * Single-level focus dimming: the selected module's own edges stay opaque; every
 * other edge sits at one quiet level — whether or not a selection is active — so
 * context stays legible instead of nearly disappearing.
 */
export function edgeOpacity(role: EdgeRole): number {
  if (role === "diff-added" || role === "diff-removed") return 1;
  return role === "neutral" ? 0.45 : 1;
}

/** Apply the sample's edge aesthetic + focus dimming (floating routing).
 *  Soft (event/runtime) edges render dashed; direction color still applies. */
export function styleEdge(edge: RFEdgeT, focus: EdgeFocus | null): RFEdgeT {
  const role = edgeRole(edge, focus);
  const color = COLOR[role];
  const focused = role !== "neutral";
  const dashed = edge.data?.kind === "soft";
  const isRemoved = role === "diff-removed";
  return {
    ...edge,
    type: "floating",
    markerEnd: isRemoved
      ? undefined
      : { type: MarkerType.ArrowClosed, color, width: 14, height: 14 },
    style: {
      stroke: color,
      strokeWidth: focused || isRemoved ? 2 : 1.2,
      opacity: edgeOpacity(role),
      ...(dashed ? { strokeDasharray: "6 4" } : {}),
    },
  };
}
