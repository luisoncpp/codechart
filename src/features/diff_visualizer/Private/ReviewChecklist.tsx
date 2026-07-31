// @Architecture(descriptionShort="Checklist of changed files for tracking diff review progress")

interface ReviewChecklistProps {
  affectedIds: readonly string[];
  deletedIds: readonly string[];
  reviewedIds: ReadonlySet<string>;
  onToggle: (moduleId: string) => void;
  onUnmarkAll: () => void;
}

/** Dropdown under the diff bar: one checkbox row per changed (or deleted) file. */
export function ReviewChecklist({
  affectedIds,
  deletedIds,
  reviewedIds,
  onToggle,
  onUnmarkAll,
}: ReviewChecklistProps) {
  const nothingReviewed = reviewedIds.size === 0;
  return (
    <div style={panelStyle} role="group" aria-label="Diff review checklist">
      <button
        type="button"
        onClick={onUnmarkAll}
        disabled={nothingReviewed}
        title="Clear every reviewed mark in this diff"
        style={unmarkAllStyle(nothingReviewed)}
      >
        Unmark all
      </button>
      {affectedIds.map((id) => (
        <ChecklistRow
          key={id}
          moduleId={id}
          reviewed={reviewedIds.has(id)}
          onToggle={onToggle}
        />
      ))}
      {deletedIds.map((id) => (
        <ChecklistRow
          key={id}
          moduleId={id}
          reviewed={reviewedIds.has(id)}
          deleted
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}

function ChecklistRow({
  moduleId,
  reviewed,
  deleted,
  onToggle,
}: {
  moduleId: string;
  reviewed: boolean;
  deleted?: boolean;
  onToggle: (moduleId: string) => void;
}) {
  return (
    <label style={rowStyle} title={moduleId}>
      <input
        type="checkbox"
        checked={reviewed}
        onChange={() => onToggle(moduleId)}
        style={{ accentColor: "#16a34a", margin: 0 }}
      />
      <span style={{ ...pathStyle, opacity: reviewed ? 0.55 : 1 }}>{moduleId}</span>
      {deleted && <span style={{ color: "#dc2626", fontSize: 10 }}>(deleted)</span>}
    </label>
  );
}

const panelStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 6px)",
  left: "50%",
  transform: "translateX(-50%)",
  minWidth: 300,
  maxWidth: 440,
  maxHeight: 320,
  overflowY: "auto",
  padding: 6,
  background: "#ffffff",
  border: "1px solid #86efac",
  borderRadius: 8,
  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
  zIndex: 6,
};

const unmarkAllStyle = (disabled: boolean): React.CSSProperties => ({
  display: "block",
  width: "100%",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 600,
  padding: "3px 6px 6px",
  marginBottom: 4,
  background: "none",
  border: "none",
  borderBottom: "1px solid #dcfce7",
  color: disabled ? "#9ca3af" : "#dc2626",
  cursor: disabled ? "default" : "pointer",
});

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "3px 6px",
  borderRadius: 4,
  fontSize: 11,
  cursor: "pointer",
};

const pathStyle: React.CSSProperties = {
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontFamily: 'ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace',
};
