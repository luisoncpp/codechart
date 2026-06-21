import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ProjectLoaderPanel } from "../src/features/project_loader";
import { GraphSessionStore } from "../src/state/graph-session";
import { createMockAnalysisClient } from "../src/ipc/analysis-client";
import { ElkLayoutEngine } from "../src/domain/layout";

function makeStore() {
  return new GraphSessionStore(createMockAnalysisClient(), new ElkLayoutEngine());
}

describe("ProjectLoaderPanel", () => {
  it("starts idle and prompts the user to open a project", () => {
    render(<ProjectLoaderPanel store={makeStore()} pickFolder={async () => null} />);

    expect(screen.getByText("Codechart")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open folder…" })).toBeInTheDocument();
    expect(
      screen.getByText("Open a TypeScript project to map it."),
    ).toBeInTheDocument();
  });

  it("loads the picked folder and shows the graph summary", async () => {
    render(
      <ProjectLoaderPanel
        store={makeStore()}
        pickFolder={async () => "/some/project"}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open folder…" }));

    await waitFor(() => {
      expect(
        screen.getByText("13 modules · 20 edges · 2 diagnostics"),
      ).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
  });

  it("stays idle when the picker is cancelled", async () => {
    render(<ProjectLoaderPanel store={makeStore()} pickFolder={async () => null} />);

    fireEvent.click(screen.getByRole("button", { name: "Open folder…" }));

    await waitFor(() => {
      expect(
        screen.getByText("Open a TypeScript project to map it."),
      ).toBeInTheDocument();
    });
  });
});
