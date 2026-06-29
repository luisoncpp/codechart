// @Architecture(descriptionShort="Lists exported symbols and their inferred kinds in the inspector")
import type React from "react";
import type { Language } from "../../../domain/graph";
import { inferSymbolKind, SYMBOL_KIND_DISPLAY } from "../../../domain/graph";

interface SymbolListProps {
  symbols: string[];
  language: Language;
}

/** Renders a module's exported symbols with inferred kind labels. */
export function SymbolList({ symbols, language }: SymbolListProps) {
  return (
    <div style={{ marginTop: 12 }}>
      <h3 style={{ fontSize: 12, margin: "0 0 4px" }}>
        Exported symbols ({symbols.length})
      </h3>
      {symbols.length === 0 ? (
        <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>None</p>
      ) : (
        <ul style={{ fontSize: 12, paddingLeft: 16, margin: 0, listStyle: "none" }}>
          {symbols.map((name) => {
            const kind = inferSymbolKind(name, language);
            const { glyph, label } = SYMBOL_KIND_DISPLAY[kind];
            return (
              <li key={name} style={rowStyle}>
                <span aria-hidden style={glyphStyle}>
                  {glyph}
                </span>
                <span>{name}</span>
                <span style={kindStyle}>{label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 6,
  marginBottom: 2,
};

const glyphStyle: React.CSSProperties = {
  width: 14,
  textAlign: "center",
  color: "#64748b",
  flexShrink: 0,
};

const kindStyle: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: 11,
};
