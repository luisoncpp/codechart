// @Architecture(descriptionShort="Preview frame header: title, path, and the pin / raw / find / close actions")
import type { PreviewFrame } from "./frame-list";

interface FrameHeaderProps {
  frame: PreviewFrame;
  /** Null hides the raw-source toggle (only markdown frames have two views). */
  rawSource: { on: boolean; toggle: () => void } | null;
  /** Null hides the find toggle (rendered markdown cannot host match spans). */
  find: { open: boolean; toggle: () => void } | null;
  /** Null hides the diff review toggle (shown only when part of an active diff). */
  diffReview?: { reviewed: boolean; toggle: () => void } | null;
  actions: { onTogglePin: () => void; onClose: () => void; onPointerDown: (e: React.PointerEvent) => void };
}

const toggleClass = (active: boolean) =>
  active
    ? "symbol-widget__find-toggle symbol-widget__find-toggle--active"
    : "symbol-widget__find-toggle";

export function FrameHeader({ frame, rawSource, find, diffReview, actions }: FrameHeaderProps) {
  const pinLabel = frame.pinned ? "Unpin frame" : "Pin frame";
  const rawLabel = rawSource?.on ? "Show rendered markdown" : "Show raw source";

  return (
    <div className="symbol-widget__header" onPointerDown={actions.onPointerDown}>
      <div className="symbol-widget__info">
        <div className="symbol-widget__title">{frame.symbolName ?? frame.moduleLabel}</div>
        <div className="symbol-widget__path">{frame.modulePath}</div>
      </div>
      <div className="symbol-widget__actions">
        {diffReview && (
          <label
            className="symbol-widget__diff-review"
            title={diffReview.reviewed ? "Reviewed — click to unmark" : "Mark as reviewed"}
          >
            <input
              type="checkbox"
              checked={diffReview.reviewed}
              onChange={diffReview.toggle}
              aria-label={diffReview.reviewed ? "Unmark file as reviewed" : "Mark file as reviewed"}
              style={{ accentColor: "#16a34a", cursor: "pointer", margin: 0 }}
            />
          </label>
        )}
        <button
          className={frame.pinned ? "symbol-widget__pin symbol-widget__pin--active" : "symbol-widget__pin"}
          onClick={actions.onTogglePin}
          aria-label={pinLabel}
          aria-pressed={frame.pinned}
          title={pinLabel}
        >
          📌
        </button>
        {rawSource && (
          <button
            className={toggleClass(rawSource.on)}
            onClick={rawSource.toggle}
            aria-label={rawLabel}
            aria-pressed={rawSource.on}
            title={rawLabel}
          >
            &lt;/&gt;
          </button>
        )}
        {find && (
          <button
            className={toggleClass(find.open)}
            onClick={find.toggle}
            aria-label="Find in file"
            aria-pressed={find.open}
            title="Find in file (Ctrl+F)"
          >
            ⌕
          </button>
        )}
        <button className="symbol-widget__close" onClick={actions.onClose} aria-label="Close widget">
          &times;
        </button>
      </div>
    </div>
  );
}
