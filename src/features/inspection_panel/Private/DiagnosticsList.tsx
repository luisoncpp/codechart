// @Architecture(descriptionShort="Shared diagnostics list for inspection panels")
import type { Diagnostic } from "../../../domain/graph";

interface DiagnosticsListProps {
  items: Diagnostic[];
}

export function DiagnosticsList({ items }: DiagnosticsListProps) {
  if (items.length === 0) return null;
  return (
    <div style={{ marginTop: 12 }}>
      <h3 style={{ fontSize: 12, margin: "0 0 4px" }}>Diagnostics</h3>
      <ul style={{ fontSize: 12, paddingLeft: 16, margin: 0 }}>
        {items.map((d) => (
          <li key={d.id} style={{ color: diagnosticColor(d.kind) }}>
            {d.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

function diagnosticColor(kind: string): string {
  return kind === "architectureViolation" ? "#dc2626" : "#b45309";
}
