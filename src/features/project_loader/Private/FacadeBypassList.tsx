// @Architecture(descriptionShort="Copyable list of facade-bypass architecture violations")
import { useRef, useState } from "react";
import type { Diagnostic } from "../../../domain/graph";

interface FacadeBypassListProps {
  violations: Diagnostic[];
}

/** Clickable label that opens a modal listing all facade-bypass errors in the project. */
export function FacadeBypassList({ violations }: FacadeBypassListProps) {
  const [open, setOpen] = useState(false);
  if (violations.length === 0) return null;

  const label =
    violations.length === 1
      ? "1 facade bypass"
      : `${violations.length} facade bypasses`;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} style={labelButtonStyle}>
        {label}
      </button>
      {open && (
        <FacadeBypassModal
          label={label}
          violations={violations}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function FacadeBypassModal({
  label,
  violations,
  onClose,
}: {
  label: string;
  violations: Diagnostic[];
  onClose: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const text = violations.map((d) => d.message).join("\n");

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    textareaRef.current?.select();
  };

  return (
    <div style={backdropStyle} onClick={onClose}>
      <div
        role="dialog"
        aria-labelledby="facade-bypass-modal-title"
        style={panelStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="facade-bypass-modal-title" style={{ margin: "0 0 12px", fontSize: 16 }}>
          {label}
        </h2>
        <textarea
          ref={textareaRef}
          readOnly
          value={text}
          rows={Math.max(12, Math.min(violations.length, 20))}
          style={textareaStyle}
        />
        <div style={actionsStyle}>
          <button type="button" onClick={copy}>
            Copy list
          </button>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

const labelButtonStyle = {
  fontSize: 12,
  color: "#dc2626",
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
  textDecoration: "underline",
  textUnderlineOffset: 2,
} as const;

const backdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "#0f172a66",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const panelStyle: React.CSSProperties = {
  width: "min(480px, 92vw)",
  background: "#fff",
  borderRadius: 10,
  padding: 20,
  boxShadow: "0 12px 40px #0f172a33",
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "ui-monospace, monospace",
  fontSize: 11,
  color: "#dc2626",
  border: "1px solid #e2e8f0",
  borderRadius: 6,
  padding: 8,
  resize: "vertical",
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  marginTop: 12,
};
