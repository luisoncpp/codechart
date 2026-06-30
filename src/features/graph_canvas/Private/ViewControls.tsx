// @Architecture(descriptionShort="Canvas overlay toggles for view filters such as hiding tests")
import { HeatmapControls } from "./HeatmapControls";
import type { HeatmapMode } from "../../../domain/graph";

interface ViewControlsProps {
  hideTests: boolean;
  onHideTestsChange: (hide: boolean) => void;
  diffActive: boolean;
  onVisualizeDiff: () => void;
  heatmapEnabled: boolean;
  heatmapMode: HeatmapMode;
  heatmapGitAvailable: boolean;
  heatmapLoading: boolean;
  onHeatmapEnabledChange: (enabled: boolean) => void;
  onHeatmapModeChange: (mode: HeatmapMode) => void;
}

/** Small overlay for graph view filters (top-right, below the level badge). */
export function ViewControls({
  hideTests,
  onHideTestsChange,
  diffActive,
  onVisualizeDiff,
  heatmapEnabled,
  heatmapMode,
  heatmapGitAvailable,
  heatmapLoading,
  onHeatmapEnabledChange,
  onHeatmapModeChange,
}: ViewControlsProps) {
  return (
    <div style={wrapStyle}>
      <label style={chipStyle}>
        <input
          type="checkbox"
          checked={hideTests}
          onChange={(e) => onHideTestsChange(e.target.checked)}
        />
        Hide tests
      </label>
      {!diffActive && (
        <>
          <HeatmapControls
            enabled={heatmapEnabled}
            mode={heatmapMode}
            gitAvailable={heatmapGitAvailable}
            loading={heatmapLoading}
            onEnabledChange={onHeatmapEnabledChange}
            onModeChange={onHeatmapModeChange}
          />
          <button type="button" onClick={onVisualizeDiff} style={buttonStyle}>
            Visualize diff…
          </button>
        </>
      )}
    </div>
  );
}

const wrapStyle: React.CSSProperties = {
  position: "absolute",
  top: 38,
  right: 10,
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
  cursor: "pointer",
  userSelect: "none",
};

const buttonStyle: React.CSSProperties = {
  padding: "3px 8px",
  fontSize: 11,
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
  color: "#166534",
  background: "#ffffffcc",
  border: "1px solid #86efac",
  borderRadius: 6,
  cursor: "pointer",
};
