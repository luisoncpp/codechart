/// <reference types="@testing-library/jest-dom" />
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ProjectLoaderPanel } from "../../src/features/project_loader";
import type { ProjectGraph } from "../../src/domain/graph";
import { testGraphSessionStore } from "../helpers/test-graph-session-store";
import goldenGraph from "../fixtures/golden/project-graph.json";

const graph = goldenGraph as unknown as ProjectGraph;

function idleStore() {
  return testGraphSessionStore();
}

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
    render(
      <ProjectLoaderPanel
        store={idleStore()}
        pickFolder={async () => "/some/project"}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open folder…" }));
    await waitFor(() => {
      expect(
        screen.getByText("13 modules · 22 edges · 2 diagnostics"),
      ).toBeInTheDocument();
    });
  });

  it("cancelling the folder picker keeps the session idle", async () => {
    render(
      <ProjectLoaderPanel store={idleStore()} pickFolder={async () => null} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open folder…" }));
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
      fireEvent.click(screen.getByRole("button", { name: "Open folder…" }));
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
    const writeText = vi.fn();
    Object.assign(navigator, { clipboard: { writeText } });
    render(
      <ProjectLoaderPanel
        store={idleStore()}
        pickFolder={async () => "/some/project"}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open folder…" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "1 facade bypass" })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "1 facade bypass" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Copy list" }));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        "src/ui/TodoList.tsx imports src/core/store.ts, bypassing the core facade",
      );
    });
  });
});
