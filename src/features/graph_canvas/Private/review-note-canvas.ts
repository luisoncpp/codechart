import { useEffect, useRef } from "react";
import { moduleIdsInGroupTree, type ProjectedGraph } from "../../../domain/graph";
import type { ReviewNoteNavigationRequest } from "../../../ipc/review-notes-client";
import type { GraphSessionStore } from "../../../state/graph-session";
import type { ReviewNotesStore } from "../../../state/review-notes";

interface NavigationDeps {
  store: GraphSessionStore;
  notes?: ReviewNotesStore;
  openPreview: (request: ReviewNoteNavigationRequest) => Promise<void>;
}

export function useReviewNoteNavigation({ store, notes, openPreview }: NavigationDeps) {
  const keepPreviewDuringFocus = useRef(false);
  const navigation = notes?.getNavigationRequest();

  useEffect(() => {
    if (!navigation || !notes) return;
    if (!notes.consumeNavigationRequest(navigation.seq)) return;
    const module = store.getGraph()?.modules.find((item) => item.path === navigation.path);
    if (!module) return;
    keepPreviewDuringFocus.current = true;
    void (async () => {
      await store.focusOn(module.id);
      await openPreview(navigation);
    })();
  }, [navigation, notes, openPreview, store]);

  return {
    shouldClosePreview: (event: MouseEvent | TouchEvent | null) =>
      event !== null || !keepPreviewDuringFocus.current,
    finishMove: () => { keepPreviewDuringFocus.current = false; },
  };
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
