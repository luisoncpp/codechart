import type { CSSProperties } from "react";

export const fieldStyle: CSSProperties = {
  position: "relative",
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

export const labelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "#64748b",
};

export const triggerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  width: "100%",
  padding: "7px 10px",
  borderRadius: 6,
  border: "1px solid #cbd5e1",
  background: "#f8fafc",
  fontSize: 12,
  textAlign: "left",
  cursor: "pointer",
};

export const triggerTextStyle: CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontFamily: "ui-monospace, monospace",
};

export const menuStyle: CSSProperties = {
  position: "absolute",
  top: "calc(100% + 4px)",
  left: 0,
  right: 0,
  zIndex: 2,
  background: "#fff",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  boxShadow: "0 10px 30px #0f172a22",
  overflow: "hidden",
};

export const searchStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  border: "none",
  borderBottom: "1px solid #e2e8f0",
  fontSize: 12,
  outline: "none",
};

export const listStyle: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 4,
  maxHeight: 220,
  overflowY: "auto",
};

export const optionStyle: CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  border: "none",
  borderRadius: 4,
  background: "transparent",
  fontSize: 12,
  fontFamily: "ui-monospace, monospace",
  textAlign: "left",
  cursor: "pointer",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

export const optionSelectedStyle: CSSProperties = {
  background: "#eef2ff",
  color: "#3730a3",
};

export const emptyStyle: CSSProperties = {
  padding: "10px 8px",
  fontSize: 12,
  color: "#94a3b8",
};
