// @Architecture(descriptionShort="Lists incoming/outgoing imports in the inspection panel")
import type { Edge } from "../../../domain/graph";

interface EdgeListProps {
  title: string;
  edges: Edge[];
  /** Which endpoint of each edge to display (the other module). */
  field: "source" | "target";
}

/** Renders a labeled list of related modules (imports / imported-by). */
export function EdgeList({ title, edges, field }: EdgeListProps) {
  return (
    <div style={{ marginTop: 12 }}>
      <h3 style={{ fontSize: 12, margin: "0 0 4px" }}>
        {title} ({edges.length})
      </h3>
      {edges.length === 0 ? (
        <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>None</p>
      ) : (
        <ul style={{ fontSize: 12, paddingLeft: 16, margin: 0 }}>
          {edges.map((e) => (
            <li key={e.id}>{e[field]}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
