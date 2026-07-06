// @Architecture(descriptionShort="Selection back/forward controls and keyboard shortcuts")
import { useEffect } from "react";
import { GraphSessionStore } from "../../../state/graph-session";

interface SelectionNavigationProps {
  store: GraphSessionStore;
}

export function SelectionNavigation({ store }: SelectionNavigationProps) {
  const canBack = store.canGoBack();
  const canForward = store.canGoForward();

  useEffect(() => {
    const navigate = (event: KeyboardEvent) => {
      if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key === "ArrowLeft" && store.canGoBack()) {
        event.preventDefault();
        void store.goBack();
      }
      if (event.key === "ArrowRight" && store.canGoForward()) {
        event.preventDefault();
        void store.goForward();
      }
    };
    window.addEventListener("keydown", navigate);
    return () => window.removeEventListener("keydown", navigate);
  }, [store]);

  return (
    <div style={wrapStyle} aria-label="Selection history">
      <HistoryButton
        label="Back"
        shortcut="Alt+Left"
        glyph="←"
        disabled={!canBack}
        onClick={() => void store.goBack()}
      />
      <HistoryButton
        label="Forward"
        shortcut="Alt+Right"
        glyph="→"
        disabled={!canForward}
        onClick={() => void store.goForward()}
      />
    </div>
  );
}

interface HistoryButtonProps {
  label: string;
  shortcut: string;
  glyph: string;
  disabled: boolean;
  onClick: () => void;
}

function HistoryButton(props: HistoryButtonProps) {
  return (
    <button
      type="button"
      aria-label={props.label}
      title={`${props.label} (${props.shortcut})`}
      disabled={props.disabled}
      onClick={props.onClick}
      style={{ ...buttonStyle, opacity: props.disabled ? 0.45 : 1 }}
    >
      {props.glyph}
    </button>
  );
}

const wrapStyle: React.CSSProperties = {
  position: "absolute",
  zIndex: 5,
  top: 10,
  left: 10,
  display: "flex",
  gap: 4,
};

const buttonStyle: React.CSSProperties = {
  width: 28,
  height: 26,
  padding: 0,
  border: "1px solid #e2e8f0",
  borderRadius: 6,
  background: "#ffffffdd",
  color: "#334155",
  fontSize: 17,
  lineHeight: 1,
  cursor: "pointer",
};
