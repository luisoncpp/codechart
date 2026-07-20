// @Architecture(descriptionShort="Passive heatmap gradient legend shown while the heatmap is on")
import { heatLegendGradient } from "../../../../domain/graph";
import type { HeatmapMode } from "../../../../domain/graph";

interface HeatmapLegendProps {
  mode: HeatmapMode;
}

/** Top-right canvas chip: gradient scale for the active heatmap. Non-interactive. */
export function HeatmapLegend({ mode }: HeatmapLegendProps) {
  return (
    <div style={wrapStyle}>
      <div style={{ ...barStyle, background: heatLegendGradient(mode) }} />
      <span style={footStyle}>Last 90 days</span>
    </div>
  );
}

const wrapStyle: React.CSSProperties = {
  position: "absolute",
  top: 38,
  right: 10,
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  gap: 2,
  padding: "4px 8px",
  background: "#ffffffcc",
  border: "1px solid #e2e8f0",
  borderRadius: 6,
  pointerEvents: "none",
};

const barStyle: React.CSSProperties = {
  width: 120,
  height: 8,
  borderRadius: 4,
};

const footStyle: React.CSSProperties = {
  fontSize: 9,
  color: "#94a3b8",
  textAlign: "right",
};
