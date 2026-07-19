// @Architecture(descriptionShort="Compact find bar rendered inside a preview frame")

interface FrameFindBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  counterText: string;
  canNavigate: boolean;
  onNavigate: (delta: 1 | -1) => void;
  onClose: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

/** Keys the bar consumes; nothing here may leak to the frame root or window. */
function handleKeyDown(e: React.KeyboardEvent, bar: FrameFindBarProps) {
  const actions: Record<string, () => void> = {
    Enter: () => bar.onNavigate(e.shiftKey ? -1 : 1),
    ArrowDown: () => bar.onNavigate(1),
    ArrowUp: () => bar.onNavigate(-1),
    Escape: () => bar.onClose(),
  };
  const action = actions[e.key];
  if (!action) return;
  e.preventDefault();
  e.stopPropagation();
  action();
}

export function FrameFindBar(props: FrameFindBarProps) {
  return (
    <div className="symbol-widget__find" role="search">
      <input
        ref={props.inputRef}
        className="symbol-widget__find-input"
        type="text"
        placeholder="Find in file"
        value={props.query}
        onChange={(e) => props.onQueryChange(e.target.value)}
        onKeyDown={(e) => handleKeyDown(e, props)}
      />
      {props.query.length > 0 && (
        <span className="symbol-widget__find-counter">{props.counterText}</span>
      )}
      <button
        type="button"
        className="symbol-widget__find-btn"
        onClick={() => props.onNavigate(-1)}
        disabled={!props.canNavigate}
        aria-label="Previous match"
      >
        ↑
      </button>
      <button
        type="button"
        className="symbol-widget__find-btn"
        onClick={() => props.onNavigate(1)}
        disabled={!props.canNavigate}
        aria-label="Next match"
      >
        ↓
      </button>
      <button
        type="button"
        className="symbol-widget__find-btn"
        onClick={props.onClose}
        aria-label="Close find bar"
      >
        ✕
      </button>
    </div>
  );
}
