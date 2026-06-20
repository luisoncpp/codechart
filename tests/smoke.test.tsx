import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ProjectLoaderPanel } from "../src/features/project_loader";
import { GraphSessionStore } from "../src/state/graph-session";
import { createMockAnalysisClient } from "../src/ipc/analysis-client";

describe("App smoke", () => {
  it("renders the project loader screen and loads the sample graph", async () => {
    const store = new GraphSessionStore(createMockAnalysisClient());
    render(<ProjectLoaderPanel store={store} />);

    expect(screen.getByText("Codechart")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Loading…" })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Load sample project" })).toBeInTheDocument();
    });

    expect(screen.getByText("1 modules, 0 edges, 0 diagnostics")).toBeInTheDocument();
  });
});
