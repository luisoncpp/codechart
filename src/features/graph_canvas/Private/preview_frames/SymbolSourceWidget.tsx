// @Architecture(descriptionShort="Displays a draggable, resizable panel with the source code of a symbol")
import { useEffect, useRef } from "react";
import type { FileLineDiff } from "../../../../domain/diff";
import { DiffCodeLines } from "../DiffCodeLines";
import { findSymbolLine } from "./symbol-source-utils";
import type { PreviewFrame } from "./frame-list";
import type { Position } from "./frame-placement";
import { startFrameDrag } from "./frame-drag";

/**
 * Center the definition line inside the widget's scrollable body only.
 * `scrollIntoView` would also scroll every outer ancestor (including the
 * window) when the frame sits near a viewport edge, shifting the whole app.
 */
function centerLineInBody(lineEl: HTMLDivElement | null) {
  const body = lineEl?.closest(".symbol-widget__body");
  if (!lineEl || !body) return;
  const lineBox = lineEl.getBoundingClientRect();
  const bodyBox = body.getBoundingClientRect();
  body.scrollTop +=
    lineBox.top - bodyBox.top - body.clientHeight / 2 + lineBox.height / 2;
}

export interface FrameHandlers {
  onClose: (id: number) => void;
  onMove: (id: number, pos: Position) => void;
  onActivate: (id: number) => void;
  onNavigate: (id: number, symbolName: string) => void;
}

interface SymbolSourceWidgetProps {
  frame: PreviewFrame;
  clickableSymbols: ReadonlySet<string>;
  fileDiff?: FileLineDiff;
  handlers: FrameHandlers;
}

/**
 * One preview frame: scrollable source code centered on the symbol's
 * definition line, draggable by its header bar. Identifiers matching
 * `clickableSymbols` navigate to the defining module in a new frame.
 */
export function SymbolSourceWidget({
  frame,
  clickableSymbols,
  fileDiff,
  handlers,
}: SymbolSourceWidgetProps) {
  const lineRef = useRef<HTMLDivElement>(null);
  const targetLine = findSymbolLine(frame.sourceText, frame.symbolName) + 1;

  useEffect(() => {
    const timer = setTimeout(/*centerDefinitionLine*/ () => {
      centerLineInBody(lineRef.current);
    }, /*delayInMs=*/50);
    return () => clearTimeout(timer);
  }, [targetLine, frame.sourceText]);

  const onHeaderPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest(".symbol-widget__close")) return;
    startFrameDrag(e, { top: frame.top, left: frame.left }, /*moveFrame*/ (pos) =>
      handlers.onMove(frame.id, pos),
    );
  };

  const onCodeClick = (e: React.MouseEvent) => {
    const symbolEl = (e.target as HTMLElement).closest(".hl-clickable");
    if (symbolEl?.textContent) handlers.onNavigate(frame.id, symbolEl.textContent);
  };

  return (
    <div
      className="symbol-widget"
      data-frame-id={frame.id}
      style={{ top: frame.top, left: frame.left, zIndex: 1000 + frame.zIndex }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={() => handlers.onActivate(frame.id)}
    >
      <div className="symbol-widget__header" onPointerDown={onHeaderPointerDown}>
        <div className="symbol-widget__info">
          <div className="symbol-widget__title">{frame.symbolName}</div>
          <div className="symbol-widget__path">{frame.modulePath}</div>
        </div>
        <button
          className="symbol-widget__close"
          onClick={() => handlers.onClose(frame.id)}
          aria-label="Close widget"
        >
          &times;
        </button>
      </div>
      <div className="symbol-widget__body" onClick={onCodeClick}>
        <pre className="symbol-widget__code">
          <DiffCodeLines
            source={frame.sourceText}
            path={frame.modulePath}
            fileDiff={fileDiff}
            lineClassPrefix="symbol-widget"
            activeLine={targetLine}
            activeLineRef={lineRef}
            clickableNames={clickableSymbols}
          />
        </pre>
      </div>
    </div>
  );
}
