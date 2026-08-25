// @Architecture(descriptionShort="Shared style constants for the dropdown menu components")
export const triggerStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "3px 8px",
  fontSize: 12,
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
  color: "#475569",
  background: "transparent",
  border: "1px solid transparent",
  borderRadius: 6,
  cursor: "pointer",
};

export const triggerOpenStyle: React.CSSProperties = {
  ...triggerStyle,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
};

export const panelStyle: React.CSSProperties = {
  position: "absolute",
  top: "100%",
  left: 0,
  marginTop: 4,
  zIndex: 1001,
  minWidth: 200,
  padding: "4px 0",
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 6,
  boxShadow: "0 4px 12px rgba(15, 23, 42, 0.12)",
};

export const backdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
};

export const itemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  padding: "6px 12px",
  border: "none",
  background: "transparent",
  textAlign: "left",
  fontSize: 12,
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
  color: "#0f172a",
  cursor: "pointer",
};

export const itemDisabledStyle: React.CSSProperties = {
  ...itemStyle,
  color: "#94a3b8",
  cursor: "not-allowed",
};

/** Fixed-width slot so labels align whether or not a check glyph is shown. */
export const checkSlotStyle: React.CSSProperties = {
  width: 14,
  flexShrink: 0,
  textAlign: "center",
  fontSize: 11,
  color: "#475569",
};

export const shortcutStyle: React.CSSProperties = {
  marginLeft: "auto",
  paddingLeft: 16,
  fontSize: 11,
  color: "#94a3b8",
};

export const separatorStyle: React.CSSProperties = {
  height: 1,
  margin: "4px 0",
  background: "#e2e8f0",
};

export const sectionHeaderStyle: React.CSSProperties = {
  padding: "6px 12px 2px 12px",
  fontSize: 11,
  fontWeight: 600,
  color: "#64748b",
};

export const submenuPanelStyle: React.CSSProperties = {
  ...panelStyle,
  position: "absolute",
  top: -4,
  left: "100%",
  marginTop: 0,
  marginLeft: 0,
};

/** Invisible hit bridge spanning the boundary between the parent menu and submenu. */
export const submenuBridgeStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  bottom: 0,
  left: -8,
  width: 8,
  pointerEvents: "auto",
};



