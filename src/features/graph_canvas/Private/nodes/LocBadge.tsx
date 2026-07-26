// @Architecture(descriptionShort="Bottom-right line-count badge for module and group boxes")
import { formatLoc } from "../../../../domain/graph";

/** Lower-right counter: the box's lines of code (a group sums its module tree).
 *  Absolutely positioned on purpose — the label/description fitters measure the
 *  box, so an in-flow counter would change every fitted font size. */
export function LocBadge({ loc, scale }: { loc?: number; scale: number }) {
  if (loc === undefined) return null;
  return (
    <span data-loc-badge aria-label={`${loc} lines`} style={badgeStyle(scale)}>
      {formatLoc(loc)}
    </span>
  );
}

function badgeStyle(scale: number): React.CSSProperties {
  return {
    position: "absolute",
    right: 4 * scale,
    bottom: 3 * scale,
    padding: `${1 * scale}px ${3 * scale}px`,
    borderRadius: 3 * scale,
    background: "rgba(255,255,255,0.7)",
    color: "currentColor",
    opacity: 0.75,
    fontSize: 9 * scale,
    lineHeight: 1.2,
    fontVariantNumeric: "tabular-nums",
    pointerEvents: "none",
    zIndex: 2,
  };
}
