// @Architecture(descriptionShort="Lists soft events emitted and listened to by a module")
import type { Edge } from "../../../domain/graph";

interface EventListProps {
  edges: Edge[];
  /** The selected module — decides emit (outgoing) vs listen (incoming). */
  moduleId: string;
}

/** Soft (event/runtime) edges for the selected module: who it emits to / hears
 *  from, plus the event token, so every dashed edge is explainable here. */
export function EventList({ edges, moduleId }: EventListProps) {
  if (edges.length === 0) return null;
  return (
    <div style={{ marginTop: 12 }}>
      <h3 style={{ fontSize: 12, margin: "0 0 4px" }}>Events ({edges.length})</h3>
      <ul style={{ fontSize: 12, paddingLeft: 16, margin: 0 }}>
        {edges.map((e) => (
          <li key={e.id} style={{ color: "#7c3aed" }}>
            {e.source === moduleId ? `emits → ${e.target}` : `listens ← ${e.source}`}{" "}
            <span style={{ color: "#94a3b8" }}>({e.trigger})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
