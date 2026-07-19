// @Architecture(descriptionShort="Displays a draggable, resizable panel with the source code of a symbol")
import { useEffect, useMemo, useRef } from "react";
import type { FileLineDiff } from "../../../../domain/diff";
import { findSymbolLine } from "./symbol-source-utils";
import type { PreviewFrame } from "./frame-list";
import type { Position } from "./frame-placement";
import { startFrameDrag } from "./frame-drag";
import { centerElementInBody } from "./center-in-body";
import { DocumentContent, SymbolCode } from "./FrameBody";
import { FrameFindBar } from "./FrameFindBar";
import { useFrameSearch } from "./use-frame-search";
import { codeMatchesByLine, descriptionRanges, matchCounter } from "./frame-search";

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
 * Ctrl/Cmd+F (focused or hovered frame) opens an in-frame find bar.
 */
export function SymbolSourceWidget({
  frame,
  clickableSymbols,
  fileDiff,
  handlers,
}: SymbolSourceWidgetProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const targetLine = useMemo(
    /*scanSourceForDefinition*/ () =>
      frame.symbolName ? findSymbolLine(frame.sourceText, frame.symbolName) + 1 : undefined,
    [frame.sourceText, frame.symbolName],
  );
  const reviewLine = frame.activeRange?.startLine;
  const search = useFrameSearch({
    frameRef,
    description: frame.symbolName ? undefined : frame.description,
    sourceText: frame.sourceText,
  });

  useEffect(() => {
    const line = reviewLine ?? targetLine;
    if (line === undefined) return;
    const timer = setTimeout(/*centerDefinitionLine*/ () => {
      centerElementInBody(lineRef.current);
    }, /*delayInMs=*/50);
    return () => clearTimeout(timer);
  }, [targetLine, reviewLine, frame.sourceText]);

  const onHeaderPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    startFrameDrag(e, { top: frame.top, left: frame.left }, /*commitDropPosition*/ (pos) =>
      handlers.onMove(frame.id, pos),
    );
  };

  const onCodeClick = (e: React.MouseEvent) => {
    const symbolEl = (e.target as HTMLElement).closest(".hl-clickable");
    if (symbolEl?.textContent) handlers.onNavigate(frame.id, symbolEl.textContent);
  };

  const onFramePointerDown = (e: React.PointerEvent) => {
    handlers.onActivate(frame.id);
    if ((e.target as HTMLElement).closest(".symbol-widget__find")) return;
    frameRef.current?.focus({ preventScroll: true });
  };

  const onFrameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Escape") return;
    e.stopPropagation();
    if (search.barOpen) {
      search.closeBar();
      frameRef.current?.focus({ preventScroll: true });
      return;
    }
    handlers.onClose(frame.id);
  };

  return (
    <div
      ref={frameRef}
      className="symbol-widget"
      data-frame-id={frame.id}
      tabIndex={-1}
      style={{ top: frame.top, left: frame.left, zIndex: 1000 + frame.zIndex }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={onFramePointerDown}
      onKeyDown={onFrameKeyDown}
    >
      <div className="symbol-widget__header" onPointerDown={onHeaderPointerDown}>
        <div className="symbol-widget__info">
          <div className="symbol-widget__title">
            {frame.symbolName ?? frame.moduleLabel}
          </div>
          <div className="symbol-widget__path">{frame.modulePath}</div>
        </div>
        <button
          className="symbol-widget__find-toggle"
          onClick={search.openBar}
          aria-label="Find in file"
        >
          ⌕
        </button>
        <button
          className="symbol-widget__close"
          onClick={() => handlers.onClose(frame.id)}
          aria-label="Close widget"
        >
          &times;
        </button>
      </div>
      {search.barOpen && (
        <FrameFindBar
          query={search.query}
          onQueryChange={search.setQuery}
          counterText={matchCounter(search.activeIndex, search.matches.length)}
          canNavigate={search.matches.length > 0}
          onNavigate={search.navigate}
          onClose={/*closeBarAndRefocusFrame*/ () => {
            search.closeBar();
            frameRef.current?.focus({ preventScroll: true });
          }}
          inputRef={search.inputRef}
        />
      )}
      <div className="symbol-widget__body" onClick={onCodeClick}>
        {frame.symbolName ? (
          <SymbolCode
            frame={frame}
            fileDiff={fileDiff}
            targetLine={targetLine!}
            lineRef={lineRef}
            clickableSymbols={clickableSymbols}
            matchProps={{
              matchesByLine: codeMatchesByLine(search.matches, search.activeIndex),
              activeMatchRef: search.activeMatchRef,
            }}
          />
        ) : (
          <DocumentContent
            frame={frame}
            fileDiff={fileDiff}
            clickableSymbols={clickableSymbols}
            matchProps={{
              matchesByLine: codeMatchesByLine(search.matches, search.activeIndex),
              descriptionRanges: descriptionRanges(search.matches, search.activeIndex),
              activeMatchRef: search.activeMatchRef,
            }}
          />
        )}
      </div>
    </div>
  );
}
