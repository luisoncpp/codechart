import { type LayoutBox, type LayoutedGraph } from "../../../layout";
import { symbolNameFromId } from "../../symbol-id";
import type { ModuleNode } from "../../model/ModuleNode";
import { inferSymbolKind } from "../symbol-kind";
import type { ModuleSymbolDescriptor } from "./node-data";
import { relativePosition } from "./rf-projection-layout";
import type { BoxIndex, ProjectionCtx } from "./rf-projection-types";

type SymbolProjectionCtx = Pick<ProjectionCtx, "options" | "moduleVisible" | "index">;

export function symbolsByModuleId(
  layout: LayoutedGraph,
  moduleById: Map<string, ModuleNode>,
  ctx: SymbolProjectionCtx,
): Map<string, ModuleSymbolDescriptor[]> {
  if (!ctx.options?.showSymbols || ctx.options?.snippets) return new Map();
  const map = new Map<string, ModuleSymbolDescriptor[]>();
  for (const box of layout.symbols) {
    if (!box.parentId) continue;
    const parent = moduleById.get(box.parentId);
    if (!parent || !ctx.moduleVisible(parent)) continue;
    const list = map.get(box.parentId) ?? [];
    list.push(descriptorFor(box, parent, ctx.index));
    map.set(box.parentId, list);
  }
  return map;
}

function descriptorFor(
  box: LayoutBox,
  parent: ModuleNode,
  index: BoxIndex,
): ModuleSymbolDescriptor {
  const label = symbolNameFromId(box.id);
  const position = relativePosition(box, index);
  return {
    id: box.id,
    label,
    kind: inferSymbolKind(label, parent.language),
    x: position.x,
    y: position.y,
    width: box.width,
    height: box.height,
  };
}
