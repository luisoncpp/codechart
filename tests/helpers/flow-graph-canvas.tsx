import { render } from "@testing-library/react";
import {
  CanvasUiState,
  GraphCanvas,
  SearchMenu,
  ViewMenu,
} from "../../src/features/graph_canvas";
import { createMockGitClient } from "../../src/ipc/git-client";
import { createMockShellClient } from "../../src/ipc/shell-client";
import type { ShellClient } from "../../src/ipc/shell-client";
import { testGraphSessionStore } from "./test-graph-session-store";
import type { GraphSessionStore } from "../../src/state/graph-session";
import { useReviewNotes, type ReviewNotesStore } from "../../src/state/review-notes";
import { ReviewNotesProvider } from "../../src/features/review_notes";
import goldenGraph from "../fixtures/golden/project-graph.json";
import type { ProjectGraph } from "../../src/domain/graph";

export const flowGoldenGraph = goldenGraph as unknown as ProjectGraph;

export async function readyGraphStore(): Promise<GraphSessionStore> {
  const store = testGraphSessionStore();
  await store.loadProject("/sample");
  return store;
}

/** Renders the toolbar menus together with the canvas — the app's real entry points. */
export function renderGraphCanvas(
  store: GraphSessionStore,
  shell: ShellClient = createMockShellClient(),
  reviewNotes?: ReviewNotesStore,
  editor = "code",
) {
  const ui = new CanvasUiState();
  const canvas = reviewNotes ? (
    <SubscribedGraphCanvas
      store={store}
      shell={shell}
      editor={editor}
      ui={ui}
      reviewNotes={reviewNotes}
    />
  ) : (
    <GraphCanvas
      store={store}
      git={createMockGitClient()}
      shell={shell}
      editor={editor}
      ui={ui}
    />
  );
  const view = render(
    <>
      <ViewMenu store={store} ui={ui} />
      <SearchMenu ui={ui} />
      {canvas}
    </>,
  );
  return { ...view, canvasUi: ui };
}

function SubscribedGraphCanvas({ store, shell, editor, ui, reviewNotes }: {
  store: GraphSessionStore;
  shell: ShellClient;
  editor: string;
  ui: CanvasUiState;
  reviewNotes: ReviewNotesStore;
}) {
  useReviewNotes(reviewNotes);
  return (
    <ReviewNotesProvider store={reviewNotes}>
      <GraphCanvas
        store={store}
        git={createMockGitClient()}
        shell={shell}
        editor={editor}
        ui={ui}
        reviewNotes={reviewNotes}
      />
    </ReviewNotesProvider>
  );
}
