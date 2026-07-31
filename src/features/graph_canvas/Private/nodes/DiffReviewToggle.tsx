// @Architecture(descriptionShort="Checkmark toggle marking a diffed file as reviewed")

/** Lower-right checkbox on diffed module cards; click is intercepted via data attribute.
 *  Kept small and in the corner so it stays out of the way when zoomed out — the side
 *  never exceeds a fifth of the module box. */
export function DiffReviewToggle({
  reviewed,
  scale = 1,
  boxWidth,
  boxHeight,
}: {
  reviewed: boolean;
  scale?: number;
  boxWidth?: number;
  boxHeight?: number;
}) {
  return (
    <button
      type="button"
      data-diff-review-toggle
      aria-pressed={reviewed}
      aria-label={reviewed ? "Unmark file as reviewed" : "Mark file as reviewed"}
      title={reviewed ? "Reviewed — click to unmark" : "Mark as reviewed"}
      style={toggleStyle(scale, reviewed, boxWidth, boxHeight)}
    >
      {reviewed ? "✓" : ""}
    </button>
  );
}

function toggleStyle(
  scale: number,
  reviewed: boolean,
  boxWidth?: number,
  boxHeight?: number,
): React.CSSProperties {
  const side = toggleSide(scale, boxWidth, boxHeight);
  return {
    position: "absolute",
    bottom: 4 * scale,
    right: 4 * scale,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: side,
    height: side,
    padding: 0,
    border: `${Math.max(1, 1 * scale)}px solid ${reviewed ? "#15803d" : "#94a3b8"}`,
    borderRadius: 3 * scale,
    background: reviewed ? "#16a34a" : "rgba(255,255,255,0.85)",
    color: "#ffffff",
    fontSize: side * 0.8,
    lineHeight: 1,
    cursor: "pointer",
    zIndex: 3,
  };
}

/** Checkbox side in px: the zoom-scaled base, clamped to 20% of the module box so a
 *  counter-scaled toggle never covers the card when zoomed out. */
function toggleSide(scale: number, boxWidth?: number, boxHeight?: number): number {
  const base = 14 * scale;
  if (boxWidth === undefined || boxHeight === undefined) return base;
  return Math.min(base, 0.2 * boxWidth, 0.2 * boxHeight);
}
