// @Architecture(descriptionShort="Copyable list of facade-bypass architecture violations")
import { useRef } from "react";
import type { Diagnostic } from "../../../domain/graph";

interface FacadeBypassListProps {
  violations: Diagnostic[];
}

/** Collapsible, copy-friendly list of all facade-bypass errors in the project. */
export function FacadeBypassList({ violations }: FacadeBypassListProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  if (violations.length === 0) return null;

  const text = violations.map((d) => d.message).join("\n");
  const label =
    violations.length === 1
      ? "1 facade bypass"
      : `${violations.length} facade bypasses`;

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    textareaRef.current?.select();
  };

  return (
    <details style={detailsStyle}>
      <summary style={summaryStyle}>{label}</summary>
      <div style={panelStyle}>
        <textarea
          ref={textareaRef}
          readOnly
          value={text}
          rows={Math.min(violations.length, 8)}
          style={textareaStyle}
        />
        <button type="button" onClick={copy} style={{ fontSize: 12 }}>
          Copy list
        </button>
      </div>
    </details>
  );
}

const detailsStyle = { fontSize: 12 } as const;
const summaryStyle = { cursor: "pointer", color: "#dc2626" } as const;
const panelStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  marginTop: 6,
  maxWidth: 420,
} as const;
const textareaStyle = {
  width: "100%",
  fontSize: 11,
  fontFamily: "monospace",
  resize: "vertical",
  color: "#dc2626",
} as const;
