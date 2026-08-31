// @Architecture(descriptionShort="Shared inline styles for the project config modals")
// Extracted so `UnrealConfigModal` and `IgnoredPathsModal` look identical without
// duplicating the chrome.

export const backdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  background: "#0f172a66",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

export const panelStyle: React.CSSProperties = {
  width: "min(640px, 92vw)",
  maxHeight: "calc(100vh - 32px)",
  overflowY: "auto",
  background: "#ffffff",
  borderRadius: 10,
  boxShadow: "0 12px 40px #0f172a33",
  padding: 20,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

export const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 18,
  color: "#0f172a",
};

export const copyStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  color: "#475569",
};

export const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#64748b",
};

export const actionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
};

export const errorStyle: React.CSSProperties = {
  padding: 8,
  borderRadius: 6,
  background: "#fee2e2",
  color: "#991b1b",
  fontSize: 12,
};
