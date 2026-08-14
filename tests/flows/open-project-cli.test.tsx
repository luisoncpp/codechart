/// <reference types="@testing-library/jest-dom" />
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ProjectLoaderPanel } from "../../src/features/project_loader";
import { useOpenStartupProject } from "../../src/app/Private/use-open-startup-project";
import { testGraphSessionStore } from "../helpers/test-graph-session-store";
import { createMockStartupClient } from "../../src/ipc/startup-client";
import type { GraphSessionStore } from "../../src/state/graph-session";
import type { StartupClient } from "../../src/ipc/startup-client";
import { waitForGraphSummary } from "../helpers/project-loader-panel";

function StartupPanel({
  startup,
  store,
}: {
  startup: StartupClient;
  store: GraphSessionStore;
}) {
  useOpenStartupProject(store, startup);
  return <ProjectLoaderPanel store={store} pickFolder={async () => null} />;
}

describe("flow: open-project-cli", () => {
  it("loads the startup project path without opening the folder dialog", async () => {
    const store = testGraphSessionStore();
    render(
      <StartupPanel
        store={store}
        startup={createMockStartupClient("/some/project")}
      />,
    );
    await waitForGraphSummary();
    await waitFor(() => {
      expect(store.getPhase()).toBe("ready");
    });
    expect(store.getProjectRoot()).toBe("/some/project");
  });

  it("shows the failed session bar when the startup path cannot be analyzed", async () => {
    const store = testGraphSessionStore({
      async analyzeProject() {
        throw new Error("project not found");
      },
      async readModuleSource() {
        return "";
      },
    });
    render(
      <StartupPanel
        store={store}
        startup={createMockStartupClient("/nonexistent")}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText("Error: project not found")).toBeInTheDocument();
    });
    expect(store.getPhase()).toBe("failed");
  });
});
