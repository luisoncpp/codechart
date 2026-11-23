// @Architecture(descriptionShort="Consumes one-shot Review Stack navigation requests to focus modules and open previews")
import { useEffect } from "react";
import type { ReviewNoteNavigationRequest } from "../../../ipc/review-notes-client";
import type { GraphSessionStore } from "../../../state/graph-session";
import type { ReviewStackStore } from "../../../state/review-stack";
import type { ProgrammaticMoveGuard } from "./navigation/programmatic-move-guard";

interface StackNavigationDeps {
  store: GraphSessionStore;
  reviewStack?: ReviewStackStore;
  openPreview: (request: ReviewNoteNavigationRequest) => Promise<void>;
  guard: ProgrammaticMoveGuard;
}

export function useReviewStackNavigation({
  store,
  reviewStack,
  openPreview,
  guard,
}: StackNavigationDeps) {
  const nav = reviewStack?.getNavigationRequest();

  useEffect(() => {
    if (!nav || !reviewStack) return;
    reviewStack.consumeNavigation(nav.seq);
    const mod = store.getGraph()?.modules.find((item) => item.path === nav.path || item.id === nav.path);
    const targetId = mod?.id ?? nav.path;
    guard.begin();
    void (async () => {
      await store.focusOn(targetId);
      if (nav.openPreview) {
        const line = nav.line ?? 1;
        await openPreview({
          id: `stack-nav-${nav.seq}`,
          seq: nav.seq,
          path: mod?.path ?? nav.path,
          startLine: line,
          endLine: line,
        });
      }
    })();
  }, [nav, reviewStack, openPreview, store, guard]);
}
