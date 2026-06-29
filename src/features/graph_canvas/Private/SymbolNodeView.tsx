// @Architecture(descriptionShort="Renders individual exported symbol boxes inside modules")
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { SymbolRFNode } from "../../../domain/graph";
import { SYMBOL_KIND_DISPLAY } from "../../../domain/graph";

const HANDLE_STYLE = { opacity: 0, width: 1, height: 1 } as const;

/** A single exported symbol — fixed-size box inside its parent module. */
export function SymbolNodeView({ data, selected }: NodeProps<SymbolRFNode>) {
  const color = data.color ?? "#64748b";
  const kind = data.kind ?? "function";
  const { glyph, label: kindLabel } = SYMBOL_KIND_DISPLAY[kind];

  return (
    <div
      className={`symbol-box symbol-box--${kind}${selected ? " symbol-box--selected" : ""}`}
      style={{ "--symbol-group-color": color } as React.CSSProperties}
      title={`${kindLabel}: ${data.label}`}
      data-kind={kind}
    >
      <Handle type="target" position={Position.Left} style={HANDLE_STYLE} />
      <span className="symbol-box__badge" aria-hidden>
        {glyph}
      </span>
      <span className="symbol-box__label">{data.label}</span>
      <Handle type="source" position={Position.Right} style={HANDLE_STYLE} />
    </div>
  );
}
