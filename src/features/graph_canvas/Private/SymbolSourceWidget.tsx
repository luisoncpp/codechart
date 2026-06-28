// @Architecture(descriptionShort="Displays a resizable panel with the source code of a symbol")
import { useEffect, useRef } from "react";
import type { FileLineDiff } from "../../../domain/diff";
import { DiffCodeLines } from "./DiffCodeLines";
import { findSymbolLine } from "./symbol-source-utils";

export { findSymbolLine } from "./symbol-source-utils";

interface SymbolSourceWidgetProps {
  symbolName: string;
  modulePath: string;
  sourceText: string;
  fileDiff?: FileLineDiff;
  onClose: () => void;
  top: number;
  left: number;
}

/**
 * A resizable, scrollable widget rendering the source code of a module
 * and centering on the line containing the definition of the symbol.
 */
export function SymbolSourceWidget({
  symbolName,
  modulePath,
  sourceText,
  fileDiff,
  onClose,
  top,
  left,
}: SymbolSourceWidgetProps) {
  const lineRef = useRef<HTMLDivElement>(null);
  const targetLine = findSymbolLine(sourceText, symbolName) + 1;

  useEffect(() => {
    const timer = setTimeout(/*scrollIntoView*/ () => {
      lineRef.current?.scrollIntoView({ block: "center", behavior: "auto" });
    }, /*delayInMs=*/50);
    return () => clearTimeout(timer);
  }, [targetLine, sourceText]);

  return (
    <div
      className="symbol-widget"
      style={{ top, left } as React.CSSProperties}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="symbol-widget__header">
        <div className="symbol-widget__info">
          <div className="symbol-widget__title">{symbolName}</div>
          <div className="symbol-widget__path">{modulePath}</div>
        </div>
        <button
          className="symbol-widget__close"
          onClick={onClose}
          aria-label="Close widget"
        >
          &times;
        </button>
      </div>
      <div className="symbol-widget__body">
        <pre className="symbol-widget__code">
          <DiffCodeLines
            source={sourceText}
            path={modulePath}
            fileDiff={fileDiff}
            lineClassPrefix="symbol-widget"
            activeLine={targetLine}
            activeLineRef={lineRef}
          />
        </pre>
      </div>
    </div>
  );
}
