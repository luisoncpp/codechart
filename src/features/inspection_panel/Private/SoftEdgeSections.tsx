// @Architecture(descriptionShort="Lists soft edges grouped by trigger prefix for the inspection panel")
import type { Edge } from "../../../domain/graph";

interface SoftEdgeSectionsProps {
  edges: Edge[];
  moduleId: string;
}

type TriggerPrefix = "event:" | "interface:" | "ipc:" | "unity:script:" | "unity:prefab:";

const SECTIONS: {
  prefix: TriggerPrefix;
  title: string;
  outgoing: (target: string) => string;
  incoming: (source: string) => string;
}[] = [
  {
    prefix: "event:",
    title: "Events",
    outgoing: (target) => `emits → ${target}`,
    incoming: (source) => `listens ← ${source}`,
  },
  {
    prefix: "interface:",
    title: "Interface seams",
    outgoing: (target) => `uses → ${target}`,
    incoming: (source) => `implemented by ← ${source}`,
  },
  {
    prefix: "ipc:",
    title: "Tauri IPC",
    outgoing: (target) => `invokes → ${target}`,
    incoming: (source) => `handled by ← ${source}`,
  },
  {
    prefix: "unity:script:",
    title: "Scripts used",
    outgoing: (target) => `uses → ${target}`,
    incoming: (source) => `used by ← ${source}`,
  },
  {
    prefix: "unity:prefab:",
    title: "Nested prefabs",
    outgoing: (target) => `references → ${target}`,
    incoming: (source) => `referenced by ← ${source}`,
  },
];

/** Soft edges touching the module, split by trigger prefix with role-aware labels. */
export function SoftEdgeSections({ edges, moduleId }: SoftEdgeSectionsProps) {
  if (edges.length === 0) return null;

  return (
    <>
      {SECTIONS.map(({ prefix, title, outgoing, incoming }) => {
        const sectionEdges = edges.filter((e) => e.trigger.startsWith(prefix));
        if (sectionEdges.length === 0) return null;
        return (
          <div key={prefix} style={{ marginTop: 12 }}>
            <h3 style={{ fontSize: 12, margin: "0 0 4px" }}>
              {title} ({sectionEdges.length})
            </h3>
            <ul style={{ fontSize: 12, paddingLeft: 16, margin: 0 }}>
              {sectionEdges.map((e) => (
                <li key={e.id} style={{ color: "#7c3aed" }}>
                  {e.source === moduleId
                    ? outgoing(e.target)
                    : incoming(e.source)}{" "}
                  <span style={{ color: "#94a3b8" }}>({e.trigger})</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </>
  );
}
