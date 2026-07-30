// @Architecture(descriptionShort="Checkmark toggle marking a diffed file as reviewed")

/** Upper-left checkbox on diffed module cards; click is intercepted via data attribute. */
export function DiffReviewToggle({
  reviewed,
  scale = 1,
}: {
  reviewed: boolean;
  scale?: number;
}) {
  return (
    <button
      type="button"
      data-diff-review-toggle
      aria-pressed={reviewed}
      aria-label={reviewed ? "Unmark file as reviewed" : "Mark file as reviewed"}
      title={reviewed ? "Reviewed — click to unmark" : "Mark as reviewed"}
      style={toggleStyle(scale, reviewed)}
    >
      {reviewed ? "✓" : ""}
    </button>
  );
}

function toggleStyle(scale: number, reviewed: boolean): React.CSSProperties {
  return {
    position: "absolute",
    top: 4 * scale,
    left: 4 * scale,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 14 * scale,
    height: 14 * scale,
    padding: 0,
    border: `${Math.max(1, 1 * scale)}px solid ${reviewed ? "#15803d" : "#94a3b8"}`,
    borderRadius: 3 * scale,
    background: reviewed ? "#16a34a" : "rgba(255,255,255,0.85)",
    color: "#ffffff",
    fontSize: 11 * scale,
    lineHeight: 1,
    cursor: "pointer",
    zIndex: 3,
  };
}
