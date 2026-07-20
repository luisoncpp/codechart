interface HeaderProps {
  label: string;
  color: string;
  zoom: number;
}

export function L2Header({ label, color, zoom }: HeaderProps) {
  const size = 16 / zoom;
  const padding = Math.max(2, 6 / zoom);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: `${color}14`,
        borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
        padding: `${padding}px ${Math.max(2, 8 / zoom)}px`,
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 4 / zoom, overflow: "hidden" }}>
        <span style={{ fontSize: size }}>📄</span>
        <span
          style={{
            fontSize: size,
            fontWeight: "bold",
            color: color,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: 8 / zoom,
          fontWeight: 600,
          color,
          background: `${color}1f`,
          padding: `${1 / zoom}px ${4 / zoom}px`,
          borderRadius: 3 / zoom,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        L2 Document
      </div>
    </div>
  );
}
