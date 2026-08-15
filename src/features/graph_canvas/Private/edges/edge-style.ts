// @Architecture(descriptionShort="Applies strokes, patterns, and colors to visual edges")
import { MarkerType } from "@xyflow/react";
import type { EdgeFocus, RFEdgeT } from "../../../../domain/graph";

export type EdgeRole =
  | "import"
  | "export"
  | "violation"
  | "neutral"
  | "diff-added"
  | "diff-removed"
  | "diff-renamed";

const COLOR: Record<EdgeRole, string> = {
  import: "#ea580c",
  export: "#2563eb",
  violation: "#dc2626",
  neutral: "#94a3b8",
  "diff-added": "#16a34a",
  "diff-removed": "#dc2626",
  "diff-renamed": "#d97706",
};

/** An edge's role relative to the selected node (module or group). */
export function edgeRole(edge: RFEdgeT, focus: EdgeFocus | null): EdgeRole {
  if (edge.data?.diffState === "added") return "diff-added";
  if (edge.data?.diffState === "removed") return "diff-removed";
  if (edge.data?.diffState === "renamed") return "diff-renamed";
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

function isDiffRole(role: EdgeRole): boolean {
  return role === "diff-added" || role === "diff-removed" || role === "diff-renamed";
}

/**
 * Single-level focus dimming: the selected module's own edges stay opaque; every
 * other edge sits at one quiet level. For diff edges: all diff edges stay opaque
 * when no selection is active; when a module is selected, diff edges not connected
 * to that module dim to 0.45 like other context edges.
 */
function edgeOpacity(
  role: EdgeRole,
  connectedToFocus = true,
  hasFocus = false,
): number {
  if (isDiffRole(role)) {
    if (!hasFocus) return 1;
    return connectedToFocus ? 1 : 0.45;
  }
  return role === "neutral" ? 0.45 : 1;
}

/** Apply the sample's edge aesthetic + focus dimming (floating routing).
 *  Soft (event/runtime) edges render dashed; direction color still applies. */
export function styleEdge(edge: RFEdgeT, focus: EdgeFocus | null): RFEdgeT {
  const role = edgeRole(edge, focus);
  const color = COLOR[role];
  const focused = role !== "neutral";
  const isDiff = isDiffRole(role);
  const connected = roleForFocus(edge, focus) !== null;
  const dashed = edge.data?.kind === "soft";
  const isRemoved = role === "diff-removed";
  const strokeWidth = isDiff ? 2.8 : (focused ? 2 : 1.2);
  return {
    ...edge,
    type: "floating",
    markerEnd: isRemoved
      ? undefined
      : { type: MarkerType.ArrowClosed, color, width: 14, height: 14 },
    style: {
      stroke: color,
      strokeWidth,
      opacity: edgeOpacity(role, connected, focus !== null),
      ...(dashed ? { strokeDasharray: "6 4" } : {}),
    },
  };
}

