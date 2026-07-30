// @Architecture(descriptionShort="Stamps reviewed-file marks onto diff-stamped React Flow nodes")
import type { ProjectedGraph, RFNode } from "../../graph";

/**
 * Display-only overlay: marks module nodes whose file was reviewed as
 * `diffReviewed` (checkmark + dimmed). Applied after `applyDiffOverlay`.
 */
export function withDiffReview(
  projected: ProjectedGraph,
  reviewedIds: ReadonlySet<string>,
): ProjectedGraph {
  if (reviewedIds.size === 0) return projected;
  return {
    ...projected,
    nodes: projected.nodes.map((node) => stampReviewed(node, reviewedIds)),
  };
}

function stampReviewed(node: RFNode, reviewedIds: ReadonlySet<string>): RFNode {
  if (node.type !== "module" || !reviewedIds.has(node.id)) return node;
  return { ...node, data: { ...node.data, diffReviewed: true } };
}
