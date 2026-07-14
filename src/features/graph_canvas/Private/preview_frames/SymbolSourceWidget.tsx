// @Architecture(descriptionShort="Displays a draggable, resizable panel with the source code of a symbol")
import { useEffect, useMemo, useRef } from "react";
import type { FileLineDiff } from "../../../../domain/diff";
import { DiffCodeLines } from "../DiffCodeLines";
import { L2CodeBlock, L2Description } from "../L2Content";
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
  const targetLine = useMemo(
    /*scanSourceForDefinition*/ () =>
      frame.symbolName ? findSymbolLine(frame.sourceText, frame.symbolName) + 1 : undefined,
    [frame.sourceText, frame.symbolName],
  );
  const reviewLine = frame.activeRange?.startLine;

  useEffect(() => {
    const line = reviewLine ?? targetLine;
    if (line === undefined) return;
    const timer = setTimeout(/*centerDefinitionLine*/ () => {
      centerLineInBody(lineRef.current);
    }, /*delayInMs=*/50);
    return () => clearTimeout(timer);
  }, [targetLine, reviewLine, frame.sourceText]);

  const onHeaderPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest(".symbol-widget__close")) return;
    startFrameDrag(e, { top: frame.top, left: frame.left }, /*commitDropPosition*/ (pos) =>
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
          <div className="symbol-widget__title">
            {frame.symbolName ?? frame.moduleLabel}
          </div>
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
        {frame.symbolName ? (
          <SymbolCode
            frame={frame}
            fileDiff={fileDiff}
            targetLine={targetLine!}
            lineRef={lineRef}
            clickableSymbols={clickableSymbols}
          />
        ) : (
          <DocumentContent
            frame={frame}
            fileDiff={fileDiff}
            clickableSymbols={clickableSymbols}
          />
        )}
      </div>
    </div>
  );
}

interface CodeContentProps {
  frame: PreviewFrame;
  fileDiff?: FileLineDiff;
  clickableSymbols: ReadonlySet<string>;
}

function SymbolCode(
  props: CodeContentProps & {
    targetLine: number;
    lineRef: React.RefObject<HTMLDivElement | null>;
  },
) {
  return (
    <pre className="symbol-widget__code">
      <DiffCodeLines
        source={props.frame.sourceText}
        path={props.frame.modulePath}
        fileDiff={props.fileDiff}
        lineClassPrefix="symbol-widget"
        activeLine={props.targetLine}
        activeLineRef={props.lineRef}
        clickableNames={props.clickableSymbols}
      />
    </pre>
  );
}

function DocumentContent({ frame, fileDiff, clickableSymbols }: CodeContentProps) {
  return (
    <div className="symbol-widget__document">
      <L2Description description={frame.description} color={frame.color} zoom={1} />
      <L2CodeBlock
        snippet={frame.sourceText}
        path={frame.modulePath}
        zoom={1}
        fileDiff={fileDiff}
        clickableNames={clickableSymbols}
        lineClassPrefix="symbol-widget"
      />
    </div>
  );
}
