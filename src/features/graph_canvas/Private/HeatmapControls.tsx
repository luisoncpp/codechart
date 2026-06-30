// @Architecture(descriptionShort="Heatmap toggle, mode switch, and compact legend chip")
import { heatLegendGradient } from "../../../domain/graph";
import type { HeatmapMode } from "../../../domain/graph";

interface HeatmapControlsProps {
  enabled: boolean;
  mode: HeatmapMode;
  gitAvailable: boolean;
  loading: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onModeChange: (mode: HeatmapMode) => void;
}

export function HeatmapControls({
  enabled,
  mode,
  gitAvailable,
  loading,
  onEnabledChange,
  onModeChange,
}: HeatmapControlsProps) {
  const disabled = !gitAvailable || loading;
  const title = !gitAvailable
    ? "Requires a git repository"
    : loading
      ? "Computing heatmap…"
      : undefined;

  return (
    <div style={panelStyle} title={title}>
      <label style={{ ...chipStyle, opacity: disabled ? 0.55 : 1, cursor: disabled ? "not-allowed" : "pointer" }}>
        <input
          type="checkbox"
          checked={enabled}
          disabled={disabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
        />
        {loading ? "Computing heatmap…" : "Heatmap"}
      </label>
      {enabled && !loading && gitAvailable && (
        <>
          <div style={segmentWrapStyle}>
            <ModeButton
              label="Activity"
              active={mode === "activity"}
              onClick={() => onModeChange("activity")}
            />
            <ModeButton
              label="Risk"
              active={mode === "risk"}
              onClick={() => onModeChange("risk")}
            />
          </div>
          <div style={legendWrapStyle}>
            <div
              style={{
                ...legendBarStyle,
                background: heatLegendGradient(mode),
              }}
            />
            <span style={legendFootStyle}>Last 90 days</span>
          </div>
        </>
      )}
    </div>
  );
}

function ModeButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...segmentBtnStyle,
        background: active ? "#e2e8f0" : "transparent",
        fontWeight: active ? 600 : 400,
      }}
    >
      {label}
    </button>
  );
}

const panelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: 6,
};

const chipStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "3px 8px",
  fontSize: 11,
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
  color: "#475569",
  background: "#ffffffcc",
  border: "1px solid #e2e8f0",
  borderRadius: 6,
  userSelect: "none",
};

const segmentWrapStyle: React.CSSProperties = {
  display: "flex",
  padding: 2,
  gap: 2,
  background: "#ffffffcc",
  border: "1px solid #e2e8f0",
  borderRadius: 6,
};

const segmentBtnStyle: React.CSSProperties = {
  padding: "2px 8px",
  fontSize: 10,
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
  color: "#475569",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
};

const legendWrapStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  gap: 2,
  padding: "4px 8px",
  background: "#ffffffcc",
  border: "1px solid #e2e8f0",
  borderRadius: 6,
};

const legendBarStyle: React.CSSProperties = {
  width: 120,
  height: 8,
  borderRadius: 4,
};

const legendFootStyle: React.CSSProperties = {
  fontSize: 9,
  color: "#94a3b8",
  textAlign: "right",
};
