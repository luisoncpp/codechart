import type { NodeTypes } from "@xyflow/react";
import { GroupNodeView } from "./GroupNodeView";
import { ModuleNodeView } from "./ModuleNodeView";

export const nodeTypes: NodeTypes = {
  group: GroupNodeView,
  module: ModuleNodeView,
};
