import type { CSSProperties } from "react";

export const backdropStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  background: "#0f172a66",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

export const panelStyle: CSSProperties = {
  width: "min(760px, 92vw)",
  maxHeight: "85vh",
  display: "flex",
  flexDirection: "column",
  background: "#ffffff",
  borderRadius: 10,
  boxShadow: "0 12px 40px #0f172a33",
  overflow: "hidden",
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
};

export const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "14px 20px",
  borderBottom: "1px solid #e2e8f0",
  gap: 12,
};

export const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 16,
  fontWeight: 700,
  color: "#0f172a",
};

export const headerActionsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

export const bodyStyle: CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "20px 24px",
};

export const footerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 20px",
  borderTop: "1px solid #e2e8f0",
  background: "#f8fafc",
  gap: 12,
};

export const footerHintStyle: CSSProperties = {
  fontSize: 12,
  color: "#64748b",
};

export const copyBtnStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "5px 10px",
  fontSize: 12,
  fontWeight: 500,
  color: "#1e293b",
  background: "#f1f5f9",
  border: "1px solid #cbd5e1",
  borderRadius: 6,
  cursor: "pointer",
};

export const copiedBtnStyle: CSSProperties = {
  ...copyBtnStyle,
  color: "#15803d",
  background: "#dcfce7",
  borderColor: "#86efac",
};

export const closeButtonStyle: CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#64748b",
  fontSize: 14,
  cursor: "pointer",
  padding: "4px 8px",
  borderRadius: 4,
};

export const dismissButtonStyle: CSSProperties = {
  padding: "5px 12px",
  fontSize: 12,
  fontWeight: 500,
  color: "#334155",
  background: "#ffffff",
  border: "1px solid #cbd5e1",
  borderRadius: 6,
  cursor: "pointer",
};
