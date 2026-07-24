// @Architecture(descriptionShort="Right-aligned toolbar status message varying by session phase")
import type { GraphSessionStore } from "../../../state/graph-session";

interface StatusTextProps {
  phase: ReturnType<GraphSessionStore["getPhase"]>;
  path: string | null;
  summary: { moduleCount: number; edgeCount: number; diagnosticCount: number } | null;
  error: string | null;
}

/** The right-hand status message — varies by session phase. */
export function StatusText({ phase, path, summary, error }: StatusTextProps) {
  if (phase === "idle")
    return <span style={hintStyle}>Open a project folder to map it.</span>;
  if (phase === "empty")
    return <span style={hintStyle}>No supported source files found in {path}.</span>;
  if (phase === "failed")
    return <span style={{ ...hintStyle, color: "#dc2626" }}>Error: {error}</span>;
  if (summary)
    return (
      <span style={hintStyle}>
        {summary.moduleCount} modules · {summary.edgeCount} edges ·{" "}
        {summary.diagnosticCount} diagnostics
      </span>
    );
  return null;
}

const hintStyle = { fontSize: 12, color: "#475569" } as const;
