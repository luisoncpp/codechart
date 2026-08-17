// @Architecture(descriptionShort="Displays a draggable, resizable panel with the source code of a symbol")
import { useEffect, useMemo, useRef, useState } from "react";
import type { FileLineDiff } from "../../../../domain/diff";
import { findSymbolLine } from "./symbol-source-utils";
import type { PreviewFrame } from "./frame-list";
import type { Position } from "./frame-placement";
import { startFrameDrag } from "./frame-drag";
import { centerElementInBody } from "./center-in-body";
import { FrameContent } from "./FrameBody";
import { FrameHeader } from "./FrameHeader";
import { FrameFindBar } from "./FrameFindBar";
import { useFrameSearch } from "./use-frame-search";
import { codeMatchesByLine, descriptionRanges, matchCounter } from "./frame-search";
import { wikiLinkFromEvent, type WikiLinkClick } from "../wiki_links/wiki-link-dom";

export interface FrameHandlers {
  onClose: (id: number) => void;
  onMove: (id: number, pos: Position) => void;
  onActivate: (id: number) => void;
  onTogglePin: (id: number) => void;
  onNavigate: (id: number, symbolName: string) => void;
  onOpenWikiLink: (id: number, link: WikiLinkClick) => void;
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
 * Ctrl/Cmd+F (focused or hovered frame) or the header ⌕ toggle opens an
 * in-frame find bar.
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
  const [rawSource, setRawSource] = useState(false);
  // Match ranges cannot be applied to rendered markdown HTML, so find stays off
  // until the reader switches to raw source.
  const renderMarkdown = !!frame.isMarkdown && !rawSource;
  const search = useFrameSearch({
    frameRef,
    description: frame.symbolName ? undefined : frame.description,
    sourceText: frame.sourceText,
    initialQuery: frame.initialFindQuery,
    enabled: !renderMarkdown,
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
    const link = wikiLinkFromEvent(e.target);
    if (link) {
      handlers.onOpenWikiLink(frame.id, link);
      return;
    }
    const symbolEl = (e.target as HTMLElement).closest(".hl-clickable");
    if (symbolEl?.textContent) handlers.onNavigate(frame.id, symbolEl.textContent);
  };

  const onFramePointerDown = (e: React.PointerEvent) => {
    handlers.onActivate(frame.id);
    if ((e.target as HTMLElement).closest(".symbol-widget__find")) return;
    frameRef.current?.focus({ preventScroll: true });
  };

  const closeBarAndRefocusFrame = () => {
    search.closeBar();
    frameRef.current?.focus({ preventScroll: true });
  };

  const onFrameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Escape") return;
    e.stopPropagation();
    if (search.barOpen) {
      closeBarAndRefocusFrame();
      return;
    }
    handlers.onClose(frame.id);
  };

  return (
    <div
      ref={frameRef}
      className={frame.pinned ? "symbol-widget symbol-widget--pinned" : "symbol-widget"}
      data-frame-id={frame.id}
      tabIndex={-1}
      style={{ top: frame.top, left: frame.left, zIndex: 1000 + frame.zIndex }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={onFramePointerDown}
      onKeyDown={onFrameKeyDown}
    >
      <FrameHeader
        frame={frame}
        rawSource={frame.isMarkdown ? { on: rawSource, toggle: () => setRawSource(!rawSource) } : null}
        find={
          renderMarkdown
            ? null
            : {
                open: search.barOpen,
                toggle: search.barOpen ? closeBarAndRefocusFrame : search.openBar,
              }
        }
        actions={{
          onTogglePin: () => handlers.onTogglePin(frame.id),
          onClose: () => handlers.onClose(frame.id),
          onPointerDown: onHeaderPointerDown,
        }}
      />
      {search.barOpen && (
        <FrameFindBar
          query={search.query}
          onQueryChange={search.setQuery}
          counterText={matchCounter(search.activeIndex, search.matches.length)}
          canNavigate={search.matches.length > 0}
          onNavigate={search.navigate}
          onClose={closeBarAndRefocusFrame}
          inputRef={search.inputRef}
        />
      )}
      <div className="symbol-widget__body" onClick={onCodeClick}>
        <FrameContent
          frame={frame}
          fileDiff={fileDiff}
          clickableSymbols={clickableSymbols}
          renderMarkdown={renderMarkdown}
          targetLine={targetLine}
          lineRef={lineRef}
          matchProps={{
            matchesByLine: codeMatchesByLine(search.matches, search.activeIndex),
            descriptionRanges: descriptionRanges(search.matches, search.activeIndex),
            activeMatchRef: search.activeMatchRef,
          }}
        />
      </div>
    </div>
  );
}
