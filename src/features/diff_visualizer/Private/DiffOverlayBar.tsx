// @Architecture(descriptionShort="Overlay bar shown while a diff visualization is active")
interface DiffOverlayBarProps {
  onStop: () => void;
}

export function DiffOverlayBar({ onStop }: DiffOverlayBarProps) {
  return (
    <div style={barStyle}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#166534" }}>
        Diff visualization active
      </span>
      <button type="button" onClick={onStop} style={buttonStyle}>
        Stop visualizing diff
      </button>
    </div>
  );
}

const barStyle: React.CSSProperties = {
  position: "absolute",
  top: 10,
  left: "50%",
  transform: "translateX(-50%)",
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "6px 12px",
  background: "#f0fdf4",
  border: "1px solid #86efac",
  borderRadius: 8,
  zIndex: 5,
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
};

const buttonStyle: React.CSSProperties = {
  fontSize: 11,
  padding: "4px 10px",
  borderRadius: 6,
  border: "1px solid #16a34a",
  background: "#fff",
  cursor: "pointer",
};
