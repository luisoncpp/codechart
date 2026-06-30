/// <reference types="@testing-library/jest-dom" />
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ProjectLoaderPanel } from "../../src/features/project_loader";
import type { ProjectGraph } from "../../src/domain/graph";
import goldenGraph from "../fixtures/golden/project-graph.json";
import { testGraphSessionStore } from "../helpers/test-graph-session-store";
import {
  clickOpenFolder,
  openFacadeBypassDialog,
  mockClipboardWriteText,
  renderProjectLoaderPanel,
  waitForGraphSummary,
} from "../helpers/project-loader-panel";

const graph = goldenGraph as unknown as ProjectGraph;

function spiedStore() {
  const analyzeProject = vi.fn(async () => graph);
  const store = testGraphSessionStore({
    analyzeProject,
    readModuleSource: async () => "",
  });
  return { store, analyzeProject };
}

describe("flow: open-project", () => {
  it("clicking Open folder loads the project summary", async () => {
    renderProjectLoaderPanel(async () => "/some/project");
    clickOpenFolder();
    await waitForGraphSummary();
  });

  it("cancelling the folder picker keeps the session idle", async () => {
    renderProjectLoaderPanel(async () => null);
    clickOpenFolder();
    await waitFor(() => {
      expect(
        screen.getByText("Open a TypeScript project to map it."),
      ).toBeInTheDocument();
    });
  });

  it("clicking Reload re-analyzes the last picked path", async () => {
    const { store, analyzeProject } = spiedStore();
    render(
      <ProjectLoaderPanel
        store={store}
        pickFolder={async () => "/my/project"}
      />,
    );
    await act(async () => {
      clickOpenFolder();
    });
    await waitFor(() => expect(store.getPhase()).toBe("ready"));
    expect(analyzeProject).toHaveBeenCalledOnce();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Reload" }));
    });
    await waitFor(() => expect(analyzeProject).toHaveBeenCalledTimes(2));
    expect(analyzeProject).toHaveBeenLastCalledWith("/my/project");
  });

  it("clicking Copy list copies the facade bypass list", async () => {
    const writeText = mockClipboardWriteText();
    const dialog = await openFacadeBypassDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: "Copy list" }));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        "src/ui/TodoList.tsx imports src/core/store.ts, bypassing the core facade",
      );
    });
  });
});
