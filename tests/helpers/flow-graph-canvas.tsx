import { render } from "@testing-library/react";
import { GraphCanvas } from "../../src/features/graph_canvas";
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

export function renderGraphCanvas(
  store: GraphSessionStore,
  shell: ShellClient = createMockShellClient(),
  reviewNotes?: ReviewNotesStore,
) {
  if (reviewNotes) {
    return render(
      <SubscribedGraphCanvas store={store} shell={shell} reviewNotes={reviewNotes} />,
    );
  }
  return render(
    <GraphCanvas store={store} git={createMockGitClient()} shell={shell} />,
  );
}

function SubscribedGraphCanvas({ store, shell, reviewNotes }: {
  store: GraphSessionStore;
  shell: ShellClient;
  reviewNotes: ReviewNotesStore;
}) {
  useReviewNotes(reviewNotes);
  return (
    <ReviewNotesProvider store={reviewNotes}>
      <GraphCanvas
        store={store}
        git={createMockGitClient()}
        shell={shell}
        reviewNotes={reviewNotes}
      />
    </ReviewNotesProvider>
  );
}
