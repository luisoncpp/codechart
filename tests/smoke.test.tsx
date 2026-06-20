import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ProjectLoaderPanel } from "../src/features/project_loader";
import { GraphSessionStore } from "../src/state/graph-session";
import { createMockAnalysisClient } from "../src/ipc/analysis-client";
import { ElkLayoutEngine } from "../src/domain/layout";

describe("App smoke", () => {
  it("renders the project loader screen and loads the sample graph", async () => {
    const store = new GraphSessionStore(
      createMockAnalysisClient(),
      new ElkLayoutEngine(),
    );
    render(<ProjectLoaderPanel store={store} />);

    expect(screen.getByText("Codechart")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Loading…" })).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Reload sample" }),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText("13 modules · 20 edges · 1 diagnostics"),
    ).toBeInTheDocument();
  });
});
