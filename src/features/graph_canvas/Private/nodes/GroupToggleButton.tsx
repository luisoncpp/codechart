// @Architecture(descriptionShort="Chevron button that collapses or expands a group")
import { ChevronIcon } from "./ChevronIcon";

/** The collapse/expand affordance. Click is handled by the canvas controller,
 *  which detects the `data-group-toggle` target on the node and toggles the
 *  group (single click here, or double-click anywhere on the group). */
export function GroupToggleButton({
  color,
  scale,
  collapsed,
}: {
  color: string;
  scale: number;
  collapsed: boolean;
}) {
  return (
    <button
      type="button"
      data-group-toggle
      aria-label={collapsed ? "Expand group" : "Collapse group"}
      title={collapsed ? "Expand" : "Collapse"}
      style={toggleButtonStyle(color, scale)}
    >
      <ChevronIcon
        direction={collapsed ? "right" : "down"}
        size={18 * scale}
        color={color}
      />
    </button>
  );
}

function toggleButtonStyle(color: string, scale: number) {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 24 * scale,
    height: 24 * scale,
    padding: 0,
    border: "none",
    borderRadius: 4 * scale,
    background: "transparent",
    color,
    lineHeight: 1,
    cursor: "pointer",
    flexShrink: 0,
  };
}
