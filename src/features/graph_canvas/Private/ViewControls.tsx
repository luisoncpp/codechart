// @Architecture(descriptionShort="Canvas overlay toggles for view filters such as hiding tests")
interface ViewControlsProps {
  hideTests: boolean;
  onHideTestsChange: (hide: boolean) => void;
}

/** Small overlay for graph view filters (top-right, below the level badge). */
export function ViewControls({ hideTests, onHideTestsChange }: ViewControlsProps) {
  return (
    <label
      style={{
        position: "absolute",
        top: 38,
        right: 10,
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
      }}
    >
      <input
        type="checkbox"
        checked={hideTests}
        onChange={(e) => onHideTestsChange(e.target.checked)}
      />
      Hide tests
    </label>
  );
}
