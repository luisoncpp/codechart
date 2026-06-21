import type { NodeTypes } from "@xyflow/react";
import { GroupNodeView } from "./GroupNodeView";
import { ModuleNodeView } from "./ModuleNodeView";
import { SymbolNodeView } from "./SymbolNodeView";

export const nodeTypes: NodeTypes = {
  group: GroupNodeView,
  module: ModuleNodeView,
  symbol: SymbolNodeView,
};
