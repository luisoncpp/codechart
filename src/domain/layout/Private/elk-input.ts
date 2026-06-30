// @Architecture(descriptionShort="Constructs the hierarchical ELK layout graph input from a project graph")
import type { ElkNode } from "elkjs/lib/elk-api";
import type { ProjectGraph } from "../../graph/ProjectGraph";
import type { LayoutOptions } from "./layout-types";
import { PRESETS } from "./layout-presets";
import { moduleBoxSize, descriptionBoxSize } from "./module-box-metrics";
import {
  ROOT_OPTIONS,
  buildEdges,
  byGroup,
  byParent,
  groupElkNode,
  moduleElkNode,
  shouldUseLayeredGroup,
  uniqueSymbols,
} from "./elk-node-builders";

/** Layout id of a group's in-body description box (a non-module leaf child). */
export function descriptionBoxId(groupId: string): string {
  return `${groupId}::__description__`;
}

/** Builds the hierarchical ELK graph from a `ProjectGraph` (deterministic, sorted). */
export function buildElkGraph(graph: ProjectGraph, options?: LayoutOptions): ElkNode {
  const childGroups = byParent(graph);
  const modulesByGroup = byGroup(graph);
  const moduleById = new Map(graph.modules.map((m) => [m.id, m]));
  const groupById = new Map(graph.groups.map((g) => [g.id, g]));
  const moduleWidth = options?.moduleWidth ?? PRESETS.moduleWidth;
  const moduleHeight = options?.moduleHeight ?? PRESETS.moduleHeight;

  // Prepend a description box (sized to its prose) into the group's flow so ELK
  // packs the modules around it — never as a full-width band. Only for expanded
  // groups (those that have other children); a collapsed group renders its own card.
  const withDescription = (
    groupId: string,
    children: ElkNode[],
    layered: boolean,
  ): ElkNode[] => {
    if (children.length === 0) return children;
    const ann = groupById.get(groupId)!.annotation;
    const short = ann?.descriptionShort;
    if (!short) return children;
    const desc: ElkNode = {
      id: descriptionBoxId(groupId),
      ...descriptionBoxSize(short, ann.descriptionLong ?? short),
      // Layered only: pin to the first (leftmost) column + first model-order slot.
      // Rectpacking groups rely on rf-projection to pull the box to the top-left.
      ...(layered
        ? { layoutOptions: { "elk.layered.layering.layerConstraint": "FIRST" } }
        : {}),
    };
    return [desc, ...children];
  };

  const build = (parentId: string | null): ElkNode[] => {
    const groupIds = childGroups.get(parentId) ?? [];
    const groups = groupIds.map((id) => {
      const nested = build(id);
      const nestedChildIds = childGroups.get(id) ?? [];
      const layered = shouldUseLayeredGroup(graph, id, nestedChildIds);
      return groupElkNode(
        groupById.get(id)!,
        withDescription(id, nested, layered),
        layered,
        nestedChildIds.length > 0,
        options?.collapsedGroupSizes,
      );
    });
    const modules = (modulesByGroup.get(parentId) ?? []).map((id) => {
      const mod = moduleById.get(id)!;
      const symbols = uniqueSymbols(mod.exportedSymbols);
      const fit = moduleBoxSize(mod.label, symbols, mod.annotation?.descriptionShort);
      const width = Math.max(moduleWidth, fit.width);
      const height = Math.max(moduleHeight, fit.height);
      return moduleElkNode(id, symbols, width, height, mod.annotation?.descriptionShort);
    });
    return [...groups, ...modules];
  };

  return {
    id: "root",
    layoutOptions: ROOT_OPTIONS,
    children: build(null),
    edges: buildEdges(graph),
  };
}
