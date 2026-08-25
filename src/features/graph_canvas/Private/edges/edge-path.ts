// @Architecture(descriptionShort="Pure floating-edge path geometry for the edge layer")
import { getBezierPath, Position } from "@xyflow/react";
import type { RFEdgeT } from "../../../../domain/graph";
import {
  borderAnchor,
  bowedPath,
  centerOf,
  type Anchor,
  type Box,
  type Side,
} from "./border-anchor";

const SOFT_BOW = 36;
const ARROW_LEN = 8;

const POSITION: Record<Side, Position> = {
  left: Position.Left,
  right: Position.Right,
  top: Position.Top,
  bottom: Position.Bottom,
};

export interface EdgeDrawStyle {
  stroke: string;
  lineWidth: number;
  opacity: number;
  dash: number[] | null;
  marker: "arrow" | "cross" | "none";
}

export interface EdgeSegment {
  path: string;
  arrowTip: Anchor;
  arrowAngle: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function drawStyleFromEdge(edge: RFEdgeT): EdgeDrawStyle {
  const style = edge.style ?? {};
  const isRemoved = edge.data?.diffState === "removed";
  const marker = isRemoved ? "cross" : (edge.markerEnd ? "arrow" : "none");
  return {
    stroke: String(style.stroke ?? "#94a3b8"),
    lineWidth: Number(style.strokeWidth ?? 1.2),
    opacity: Number(style.opacity ?? 1),
    dash: parseDash(style.strokeDasharray),
    marker,
  };
}


export function styleKeyFromDrawStyle(style: EdgeDrawStyle): string {
  const dash = style.dash?.join(",") ?? "";
  return `${style.stroke}|${style.lineWidth}|${style.opacity}|${dash}|${style.marker}`;
}

function floatingPathBetween(from: Anchor, to: Anchor, isSoft: boolean): string {
  if (isSoft) return bowedPath(from, to, /*bow=*/ SOFT_BOW);
  return getBezierPath({
    sourceX: from.x,
    sourceY: from.y,
    sourcePosition: POSITION[from.side],
    targetX: to.x,
    targetY: to.y,
    targetPosition: POSITION[to.side],
  })[0];
}

export function segmentBounds(
  from: Anchor,
  to: Anchor,
  isSoft: boolean,
): Pick<EdgeSegment, "minX" | "minY" | "maxX" | "maxY"> {
  let minX = Math.min(from.x, to.x);
  let minY = Math.min(from.y, to.y);
  let maxX = Math.max(from.x, to.x);
  let maxY = Math.max(from.y, to.y);
  if (isSoft) {
    const mx = (from.x + to.x) / 2;
    const my = (from.y + to.y) / 2;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const cx = mx + (-dy / len) * SOFT_BOW;
    const cy = my + (dx / len) * SOFT_BOW;
    minX = Math.min(minX, cx);
    minY = Math.min(minY, cy);
    maxX = Math.max(maxX, cx);
    maxY = Math.max(maxY, cy);
  }
  const pad = ARROW_LEN;
  return {
    minX: minX - pad,
    minY: minY - pad,
    maxX: maxX + pad,
    maxY: maxY + pad,
  };
}

export function segmentForEdge(
  edge: RFEdgeT,
  boxes: Map<string, Box>,
): EdgeSegment | null {
  const sourceBox = boxes.get(edge.source);
  const targetId = edge.data?.groupTargetId ?? edge.target;
  const targetBox = boxes.get(targetId);
  if (!sourceBox || !targetBox) return null;

  const from = borderAnchor(sourceBox, centerOf(targetBox));
  const to = borderAnchor(targetBox, centerOf(sourceBox));
  const isSoft = edge.data?.kind === "soft";
  const path = floatingPathBetween(from, to, isSoft);
  const arrowAngle = Math.atan2(to.y - from.y, to.x - from.x);
  const bounds = segmentBounds(from, to, isSoft);
  return { path, arrowTip: to, arrowAngle, ...bounds };
}

function parseDash(value: unknown): number[] | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parts = value.split(/[\s,]+/).map(Number).filter(Number.isFinite);
  return parts.length ? parts : null;
}
