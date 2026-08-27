// @Architecture(descriptionShort="Interactive heatmap legend and timeframe control")
import { useState } from "react";
import {
  heatLegendGradient,
  heatmapModeLabel,
  heatmapModeNeedsGit,
} from "../../../../domain/graph";
import type { HeatmapMode } from "../../../../domain/graph";
import { MetricsWindowModal } from "./MetricsWindowModal";

interface HeatmapLegendProps {
  mode: HeatmapMode;
  days: number;
  onApplyDays: (days: number) => Promise<void>;
}

/** Top-right canvas chip: gradient scale; git modes also expose the history window. */
export function HeatmapLegend({ mode, days, onApplyDays }: HeatmapLegendProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const gitMode = heatmapModeNeedsGit(mode);
  return (
    <>
      <div style={wrapStyle}>
        <div style={{ ...barStyle, background: heatLegendGradient(mode) }} />
        {gitMode ? (
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => setModalOpen(true)}
            style={footStyle}
          >
            Last {days} days
          </button>
        ) : (
          <span style={captionStyle}>{heatmapModeLabel(mode)}</span>
        )}
      </div>
      {modalOpen && gitMode && (
        <MetricsWindowModal
          days={days}
          onApply={onApplyDays}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
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
  pointerEvents: "auto",
};

const barStyle: React.CSSProperties = {
  width: 120,
  height: 8,
  borderRadius: 4,
};

const footStyle: React.CSSProperties = {
  border: 0,
  borderBottom: "1px dashed #94a3b8",
  padding: 0,
  background: "transparent",
  fontSize: 9,
  color: "#94a3b8",
  textAlign: "right",
  cursor: "pointer",
};

const captionStyle: React.CSSProperties = {
  ...footStyle,
  borderBottom: 0,
  cursor: "default",
};
