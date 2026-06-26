// @Architecture(descriptionShort="Plug/unplug toggle for hiding node connections")
import { MODULE_BOX } from "../../../domain/layout";

const PLUG = "🔌";

/** Upper-right affordance: connected = full plug, disconnected = faded plug. */
export function ConnectionToggle({
  disconnected,
  scale = 1,
}: {
  disconnected: boolean;
  scale?: number;
}) {
  return (
    <button
      type="button"
      data-connection-toggle
      aria-label={disconnected ? "Connect — show connections" : "Disconnect — hide connections"}
      title={disconnected ? "Connect" : "Disconnect"}
      style={toggleStyle(scale, disconnected)}
    >
      {PLUG}
    </button>
  );
}

function toggleStyle(scale: number, disconnected: boolean): React.CSSProperties {
  return {
    position: "absolute",
    top: 4 * scale,
    right: MODULE_BOX.connectionToggleInset * scale,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: MODULE_BOX.connectionToggleSize * scale,
    height: MODULE_BOX.connectionToggleSize * scale,
    padding: 0,
    border: "none",
    borderRadius: 4 * scale,
    background: disconnected ? "rgba(255,255,255,0.55)" : "transparent",
    opacity: disconnected ? 0.45 : 1,
    fontSize: 12 * scale,
    lineHeight: 1,
    cursor: "pointer",
    zIndex: 2,
  };
}
