import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { SymbolRFNode } from "../../../domain/graph";
import { SYMBOL_BOX } from "../../../domain/layout/Private/symbol-box-metrics";

const HANDLE_STYLE = { opacity: 0, width: 1, height: 1 } as const;

/** A single exported symbol — fixed-size box inside its parent module. */
export function SymbolNodeView({ data, selected }: NodeProps<SymbolRFNode>) {
  const color = data.color ?? "#64748b";
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: `0 ${SYMBOL_BOX.hPadding / 2}px`,
        fontSize: SYMBOL_BOX.fontSize,
        fontFamily:
          'ui-monospace, "SF Mono", "Cascadia Code", "JetBrains Mono", Menlo, Consolas, monospace',
        color: "#1e293b",
        background: "#ffffff",
        border: `1px solid ${color}`,
        borderRadius: 4,
        outline: selected ? "2px solid #2563eb" : "none",
        overflow: "hidden",
      }}
      title={data.label}
    >
      <Handle type="target" position={Position.Left} style={HANDLE_STYLE} />
      <span
        style={{
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          textAlign: "center",
        }}
      >
        {data.label}
      </span>
      <Handle type="source" position={Position.Right} style={HANDLE_STYLE} />
    </div>
  );
}
