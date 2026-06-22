// @Architecture(descriptionShort="Displays file path, group name, and architecture annotations")
import type { Annotation, GroupNode, ModuleNode } from "../../../domain/graph";

interface MetadataSectionProps {
  module: ModuleNode;
  group: GroupNode | undefined;
}

/** Render the `@Architecture` annotations (Phase 10 metadata) for the selected
 *  module and its group. Renders nothing when neither carries an annotation, so
 *  un-annotated graphs degrade gracefully. */
export function MetadataSection({ module, group }: MetadataSectionProps) {
  const hasModule = !!module.annotation;
  const hasGroup = !!group?.annotation;
  if (!hasModule && !hasGroup) return null;
  return (
    <div style={{ marginTop: 12 }}>
      <h3 style={{ fontSize: 12, margin: "0 0 4px" }}>Architecture</h3>
      {hasModule && <Block title={typeLabel(module.annotation!)} note={module.annotation!} />}
      {hasGroup && <Block title={`Group · ${group!.label}`} note={group!.annotation!} />}
    </div>
  );
}

function typeLabel(a: Annotation): string {
  return a.type ? `This module · ${a.type}` : "This module";
}

function Block({ title, note }: { title: string; note: Annotation }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <p style={{ fontSize: 11, fontWeight: 600, margin: "0 0 2px", color: "#475569" }}>
        {title}
      </p>
      {note.descriptionShort && (
        <p style={{ fontSize: 12, margin: 0 }}>{note.descriptionShort}</p>
      )}
      {note.descriptionLong && (
        <p style={{ fontSize: 11, margin: "2px 0 0", color: "#64748b" }}>
          {note.descriptionLong}
        </p>
      )}
    </div>
  );
}
