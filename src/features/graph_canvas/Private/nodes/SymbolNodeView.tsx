// @Architecture(descriptionShort="Renders individual exported symbol boxes inside modules")
import type { ModuleNodeData, ModuleSymbolDescriptor } from "../../../../domain/graph";
import { SYMBOL_KIND_DISPLAY } from "../../../../domain/graph";
import {
  symbolBorderColor,
  symbolHeatMixPercent,
  symbolHeatTintVar,
} from "./heat-node-styles";

export interface SymbolBoxProps {
  symbol: ModuleSymbolDescriptor;
  moduleData: ModuleNodeData;
  color: string;
}

/** A single exported symbol — presentational box inside its parent module card. */
export function SymbolNodeView({ symbol, moduleData, color }: SymbolBoxProps) {
  const kind = symbol.kind ?? "function";
  const { glyph, label: kindLabel } = SYMBOL_KIND_DISPLAY[kind];
  const heat = moduleData;
  const borderColor = symbolBorderColor(heat, color);
  const heatTint = symbolHeatTintVar(heat);
  const heatMix = symbolHeatMixPercent(heat);
  const heatClass = moduleData.heatmapActive ? " symbol-box--heat" : "";
  const diffClass = symbol.diffState ? ` symbol-box--diff-${symbol.diffState}` : "";
  const diffLabel = symbol.diffState ? `, ${symbol.diffState} in diff` : "";

  return (
    <div
      className={`symbol-box symbol-box--${kind}${heatClass}${diffClass}`}
      style={{
        "--symbol-group-color": borderColor,
        ...(heatTint ? { "--heat-tint": heatTint, "--heat-mix": `${heatMix}%` } : {}),
      } as React.CSSProperties}
      title={`${kindLabel}: ${symbol.label}${diffLabel}`}
      data-id={symbol.id}
      data-symbol-id={symbol.id}
      data-symbol-name={symbol.label}
      data-kind={kind}
      data-diff-state={symbol.diffState}
    >
      <span className="symbol-box__badge" aria-hidden>
        {glyph}
      </span>
      <span className="symbol-box__label">{symbol.label}</span>
    </div>
  );
}
