import { useEffect } from "react";
import { moduleIdsInGroupTree, type ProjectedGraph } from "../../../domain/graph";
import type { ReviewNoteNavigationRequest } from "../../../ipc/review-notes-client";
import type { GraphSessionStore } from "../../../state/graph-session";
import type { ReviewNotesStore } from "../../../state/review-notes";
import type { ProgrammaticMoveGuard } from "./programmatic-move-guard";

interface NavigationDeps {
  store: GraphSessionStore;
  notes?: ReviewNotesStore;
  openPreview: (request: ReviewNoteNavigationRequest) => Promise<void>;
  guard: ProgrammaticMoveGuard;
}

export function useReviewNoteNavigation({ store, notes, openPreview, guard }: NavigationDeps) {
  const navigation = notes?.getNavigationRequest();

  useEffect(() => {
    if (!navigation || !notes) return;
    if (!notes.consumeNavigationRequest(navigation.seq)) return;
    const module = store.getGraph()?.modules.find((item) => item.path === navigation.path);
    if (!module) return;
    guard.begin();
    void (async () => {
      await store.focusOn(module.id);
      await openPreview(navigation);
    })();
  }, [navigation, notes, openPreview, store, guard]);
}

export function withReviewCounts(
  projected: ProjectedGraph,
  graph: ReturnType<GraphSessionStore["getGraph"]>,
  notes: ReviewNotesStore,
): ProjectedGraph {
  if (!graph) return projected;
  return {
    ...projected,
    nodes: projected.nodes.map((node) => {
      if (node.type === "module") {
        const count = notes.countForModule(node.id);
        return count ? { ...node, data: { ...node.data, reviewNoteCount: count } } : node;
      }
      if (node.type === "group") {
        const count = [...moduleIdsInGroupTree(graph, node.id)].reduce(
          (total, id) => total + notes.countForModule(id), /*initialValue=*/0,
        );
        return count ? { ...node, data: { ...node.data, reviewNoteCount: count } } : node;
      }
      return node;
    }),
  };
}
