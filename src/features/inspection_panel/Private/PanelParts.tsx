// @Architecture(descriptionShort="Shared chrome and layout rows for the inspection panel")
import type React from "react";
import { useInspectorLayout } from "./InspectorLayoutContext";
import { PanelResizeHandle } from "./PanelResizeHandle";

export function PanelChrome({
  onHide,
  activeTab = "inspector",
  onTabChange,
  children,
}: {
  onHide?: () => void;
  activeTab?: "inspector" | "review-notes";
  onTabChange?: (tab: "inspector" | "review-notes") => void;
  children: React.ReactNode;
}) {
  const { width } = useInspectorLayout();

  return (
    <aside style={{ ...panelStyle, width, flexShrink: 0 }}>
      <PanelResizeHandle />
      <div style={headerStyle}>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => onTabChange?.("inspector")} style={tabStyle(activeTab === "inspector")}>Inspector</button>
          <button type="button" onClick={() => onTabChange?.("review-notes")} style={tabStyle(activeTab === "review-notes")}>Review Notes</button>
        </div>
        {onHide && (
          <button
            type="button"
            onClick={onHide}
            aria-label="Hide inspector"
            title="Hide inspector"
            style={hideBtnStyle}
          >
            ▶
          </button>
        )}
      </div>
      {children}
    </aside>
  );
}

export function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <dt style={{ fontWeight: 600, minWidth: 70 }}>{label}</dt>
      <dd style={{ margin: 0 }}>{value}</dd>
    </div>
  );
}

export const linkButtonStyle: React.CSSProperties = {
  display: "block",
  minWidth: 0,
  overflowWrap: "anywhere",
  border: "none",
  background: "none",
  padding: 0,
  font: "inherit",
  color: "#2563eb",
  cursor: "pointer",
  textAlign: "left",
};

const panelStyle = {
  position: "relative",
  boxSizing: "border-box",
  height: "100%",
  minHeight: 0,
  padding: 16,
  borderLeft: "1px solid #e2e8f0",
  background: "#f8fafc",
  overflowY: "auto",
  fontFamily: "sans-serif",
} as const;

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 12,
};

const headerLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "#64748b",
};

const hideBtnStyle: React.CSSProperties = {
  padding: "2px 6px",
  fontSize: 11,
  lineHeight: 1,
  color: "#475569",
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 4,
  cursor: "pointer",
};

function tabStyle(active: boolean): React.CSSProperties {
  return { ...headerLabelStyle, padding: 0, border: 0, background: "transparent", cursor: "pointer", color: active ? "#5b21b6" : "#64748b" };
}
