// @Architecture(descriptionShort="Stamps Review Stack cohort spotlight and blast radius depths onto projected nodes")
import type { ProjectedGraph, RFNode } from "../rf/node-data";

export interface ReviewStackOverlayOptions {
  spotlightModuleIds: ReadonlySet<string> | null;
  blastDepths: ReadonlyMap<string, number> | null;
}

/**
 * Display-only overlay applied after `withDiffReview`: stamps cohort spotlight
 * dimming and blast-radius depth badges onto module nodes.
 */
export function withReviewStackOverlay(
  projected: ProjectedGraph,
  options: ReviewStackOverlayOptions,
): ProjectedGraph {
  const { spotlightModuleIds, blastDepths } = options;
  if (!spotlightModuleIds && !blastDepths) return projected;
  return {
    ...projected,
    nodes: projected.nodes.map((node) => stampNode(node, spotlightModuleIds, blastDepths)),
  };
}

function stampNode(
  node: RFNode,
  spotlight: ReadonlySet<string> | null,
  blastDepths: ReadonlyMap<string, number> | null,
): RFNode {
  if (node.type !== "module") return node;
  const spotlightState = spotlight
    ? spotlight.has(node.id)
      ? ("active" as const)
      : ("dimmed" as const)
    : undefined;
  const blastDepth = blastDepths?.get(node.id);
  if (spotlightState === undefined && blastDepth === undefined) return node;
  return {
    ...node,
    data: {
      ...node.data,
      ...(spotlightState !== undefined ? { spotlightState } : {}),
      ...(blastDepth !== undefined ? { blastDepth } : {}),
    },
  };
}
