// @Architecture(descriptionShort="Lists incoming/outgoing imports in the inspection panel")
import type React from "react";
import type { Edge } from "../../../domain/graph";

interface EdgeListProps {
  title: string;
  edges: Edge[];
  /** Which endpoint of each edge to display (the other module). */
  field: "source" | "target";
  onItemClick?: (moduleId: string) => void;
}

/** Renders a labeled list of related modules (imports / imported-by). */
export function EdgeList({ title, edges, field, onItemClick }: EdgeListProps) {
  return (
    <div style={{ marginTop: 12 }}>
      <h3 style={{ fontSize: 12, margin: "0 0 4px" }}>
        {title} ({edges.length})
      </h3>
      {edges.length === 0 ? (
        <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>None</p>
      ) : (
        <ul style={{ fontSize: 12, paddingLeft: 16, margin: 0 }}>
          {edges.map((e) => {
            const moduleId = e[field];
            if (!onItemClick) {
              return <li key={e.id}>{moduleId}</li>;
            }
            return (
              <li key={e.id} style={{ listStyle: "disc" }}>
                <button
                  type="button"
                  onClick={() => onItemClick(moduleId)}
                  style={linkButtonStyle}
                >
                  {moduleId}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const linkButtonStyle: React.CSSProperties = {
  border: "none",
  background: "none",
  padding: 0,
  font: "inherit",
  color: "#2563eb",
  cursor: "pointer",
  textAlign: "left",
};
