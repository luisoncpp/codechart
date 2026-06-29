export type DiffMode = "paste" | "commits";

export function ModePicker({
  mode,
  gitAvailable,
  onChange,
}: {
  mode: DiffMode;
  gitAvailable: boolean;
  onChange: (mode: DiffMode) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
      <label style={radioStyle}>
        <input
          type="radio"
          checked={mode === "paste"}
          onChange={() => onChange("paste")}
        />
        Paste diff
      </label>
      <label style={{ ...radioStyle, opacity: gitAvailable ? 1 : 0.5 }}>
        <input
          type="radio"
          checked={mode === "commits"}
          disabled={!gitAvailable}
          onChange={() => onChange("commits")}
        />
        Git commits
      </label>
    </div>
  );
}

export function PastePanel({
  text,
  onChange,
}: {
  text: string;
  onChange: (value: string) => void;
}) {
  return (
    <textarea
      value={text}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Paste a unified diff (git diff output)…"
      style={textareaStyle}
      rows={12}
    />
  );
}

const radioStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 13,
  cursor: "pointer",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "ui-monospace, monospace",
  fontSize: 11,
  border: "1px solid #e2e8f0",
  borderRadius: 6,
  padding: 8,
};
