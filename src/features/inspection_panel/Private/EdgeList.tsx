// @Architecture(descriptionShort="Lists incoming/outgoing imports in the inspection panel")
import type React from "react";
import type { Edge } from "../../../domain/graph";
import { ModuleLink } from "./PanelParts";

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
        <ul style={listStyle}>
          {edges.map((edge) => (
            <EdgeItem
              key={edge.id}
              edge={edge}
              field={field}
              onItemClick={onItemClick}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function EdgeItem({ edge, field, onItemClick }: Omit<EdgeListProps, "title" | "edges"> & {
  edge: Edge;
}) {
  const moduleId = edge[field];
  return (
    <li style={itemStyle}>
      <Bullet />
      <ModuleLink moduleId={moduleId} onClick={onItemClick} />
    </li>
  );
}

function Bullet() {
  return (
    <span aria-hidden="true" style={bulletStyle}>
      •
    </span>
  );
}

const listStyle: React.CSSProperties = {
  fontSize: 12,
  paddingLeft: 0,
  margin: 0,
  listStyle: "none",
};

const itemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 4,
};

const bulletStyle: React.CSSProperties = {
  flex: "0 0 8px",
  textAlign: "center",
};
