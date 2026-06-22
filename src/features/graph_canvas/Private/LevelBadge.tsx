import type { ZoomLevel } from "../../../domain/graph";

const LABEL: Record<ZoomLevel, string> = {
  0: "L0 · overview",
  1: "L1 · modules",
  1.5: "L1.5 · symbols",
  2: "L2 · source",
};

interface LevelBadgeProps {
  level: ZoomLevel;
}

/** Read-out of the active semantic-zoom level (driven by scroll). */
export function LevelBadge({ level }: LevelBadgeProps) {
  return (
    <div
      style={{
        position: "absolute",
        top: 10,
        right: 10,
        padding: "3px 8px",
        fontSize: 11,
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        fontWeight: 600,
        color: "#475569",
        background: "#ffffffcc",
        border: "1px solid #e2e8f0",
        borderRadius: 6,
        pointerEvents: "none",
      }}
    >
      {LABEL[level]}
    </div>
  );
}
