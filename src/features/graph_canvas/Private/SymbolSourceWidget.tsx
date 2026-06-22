// @Architecture(descriptionShort="Displays a resizable panel with the source code of a symbol")
import { useEffect, useRef } from "react";

interface SymbolSourceWidgetProps {
  symbolName: string;
  modulePath: string;
  sourceText: string;
  onClose: () => void;
  top: number;
  left: number;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Locate the 0-indexed line number where a symbol is defined.
 */
export function findSymbolLine(source: string, symbolName: string): number {
  const lines = source.split("\n");
  if (symbolName === "default") {
    const idx = lines.findIndex((l) => /\bexport\s+default\b/.test(l));
    return idx !== -1 ? idx : 0;
  }
  const escaped = escapeRegExp(symbolName);
  const defRegex = new RegExp(`\\b(class|function|const|let|var|interface|type|enum|namespace|struct)\\s+${escaped}\\b`);
  let idx = lines.findIndex((l) => defRegex.test(l));
  if (idx !== -1) return idx;

  const assignRegex = new RegExp(`\\b${escaped}\\s*[:=]`);
  idx = lines.findIndex((l) => assignRegex.test(l));
  if (idx !== -1) return idx;

  const wordRegex = new RegExp(`\\b${escaped}\\b`);
  idx = lines.findIndex((l) => wordRegex.test(l));
  if (idx !== -1) return idx;

  return 0;
}

function CodeLines({
  lines,
  targetLine,
  lineRef,
}: {
  lines: string[];
  targetLine: number;
  lineRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <pre className="symbol-widget__code">
      {lines.map((line, idx) => (
        <div
          key={idx}
          ref={idx === targetLine ? lineRef : undefined}
          className={`symbol-widget__line ${
            idx === targetLine ? "symbol-widget__line--active" : ""
          }`}
        >
          <span className="symbol-widget__ln">{idx + 1}</span>
          <span className="symbol-widget__text">{line || " "}</span>
        </div>
      ))}
    </pre>
  );
}

/**
 * A resizable, scrollable widget rendering the source code of a module
 * and centering on the line containing the definition of the symbol.
 */
export function SymbolSourceWidget({
  symbolName,
  modulePath,
  sourceText,
  onClose,
  top,
  left,
}: SymbolSourceWidgetProps) {
  const lineRef = useRef<HTMLDivElement>(null);
  const lines = sourceText.split("\n");
  const targetLine = findSymbolLine(sourceText, symbolName);

  useEffect(() => {
    const timer = setTimeout(/*scrollIntoView*/ () => {
      if (lineRef.current) {
        lineRef.current.scrollIntoView({ block: "center", behavior: "auto" });
      }
    }, /*delayInMs=*/50);
    return () => clearTimeout(timer);
  }, [targetLine]);

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
        <CodeLines lines={lines} targetLine={targetLine} lineRef={lineRef} />
      </div>
    </div>
  );
}
