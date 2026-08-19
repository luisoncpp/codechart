// @Architecture(descriptionShort="Absolutely positions exported symbol boxes inside a module card")
import type { ModuleNodeData, ModuleSymbolDescriptor } from "../../../../domain/graph";
import { SymbolNodeView } from "./SymbolNodeView";

interface ModuleSymbolBoxesProps {
  symbols: ModuleSymbolDescriptor[];
  moduleData: ModuleNodeData;
  color: string;
}

export function ModuleSymbolBoxes({ symbols, moduleData, color }: ModuleSymbolBoxesProps) {
  return (
    <>
      {symbols.map((symbol) => (
        <div
          key={symbol.id}
          style={{
            position: "absolute",
            left: symbol.x,
            top: symbol.y,
            width: symbol.width,
            height: symbol.height,
            pointerEvents: "auto",
          }}
        >
          <SymbolNodeView symbol={symbol} moduleData={moduleData} color={color} />
        </div>
      ))}
    </>
  );
}
