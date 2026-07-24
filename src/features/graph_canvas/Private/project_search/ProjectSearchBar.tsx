// @Architecture(descriptionShort="Presentational find bar: input, match counter, nav buttons")
import React from "react";

interface ProjectSearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  placeholder: string;
  ariaLabel: string;
  /** `null` hides the counter (no search ran). */
  counterText: string | null;
  /** True when the backend clipped the result set at its match cap. */
  truncated: boolean;
  canNavigate: boolean;
  onNavigate: (delta: 1 | -1) => void;
  onClose: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  /** Drop below the diff overlay bar when one occupies the top-center slot. */
  belowDiffBar: boolean;
}

export function ProjectSearchBar(props: ProjectSearchBarProps) {
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") return handle(event, props.onClose);
    if (event.key === "Enter") {
      return handle(event, /*navigate*/ () => props.onNavigate(event.shiftKey ? -1 : 1));
    }
    if (event.key === "ArrowDown") return handle(event, /*next*/ () => props.onNavigate(1));
    if (event.key === "ArrowUp") return handle(event, /*previous*/ () => props.onNavigate(-1));
  };

  return (
    <div
      role="search"
      aria-label="Project search"
      data-preview-keep=""
      style={{ ...barStyle, top: props.belowDiffBar ? 48 : 10 }}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        ref={props.inputRef}
        value={props.query}
        onChange={(e) => props.onQueryChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={props.placeholder}
        aria-label={props.ariaLabel}
        style={inputStyle}
      />
      {props.counterText !== null && (
        <span
          style={counterStyle}
          title={props.truncated ? "Showing the first 500 matches" : undefined}
        >
          {props.counterText}
        </span>
      )}
      <BarButton
        label="Previous match"
        shortcut="Shift+Enter"
        glyph="↑"
        disabled={!props.canNavigate}
        onClick={() => props.onNavigate(-1)}
      />
      <BarButton
        label="Next match"
        shortcut="Enter"
        glyph="↓"
        disabled={!props.canNavigate}
        onClick={() => props.onNavigate(1)}
      />
      <BarButton
        label="Close search"
        shortcut="Esc"
        glyph="✕"
        disabled={false}
        onClick={props.onClose}
      />
    </div>
  );
}

function handle(event: React.KeyboardEvent, action: () => void) {
  event.preventDefault();
  action();
}

interface BarButtonProps {
  label: string;
  shortcut: string;
  glyph: string;
  disabled: boolean;
  onClick: () => void;
}

function BarButton(props: BarButtonProps) {
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

const barStyle: React.CSSProperties = {
  position: "absolute",
  zIndex: 30,
  left: "50%",
  transform: "translateX(-50%)",
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 6px",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  background: "#ffffffee",
  boxShadow: "0 2px 8px rgba(15, 23, 42, 0.12)",
};

const inputStyle: React.CSSProperties = {
  width: 220,
  padding: "3px 8px",
  border: "1px solid #e2e8f0",
  borderRadius: 6,
  fontSize: 13,
  color: "#334155",
  outline: "none",
};

const counterStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#64748b",
  whiteSpace: "nowrap",
  minWidth: 56,
  textAlign: "center",
};

const buttonStyle: React.CSSProperties = {
  width: 26,
  height: 24,
  padding: 0,
  border: "1px solid #e2e8f0",
  borderRadius: 6,
  background: "#ffffffdd",
  color: "#334155",
  fontSize: 14,
  lineHeight: 1,
  cursor: "pointer",
};
