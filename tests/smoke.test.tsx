import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ProjectLoaderPanel } from "../src/features/project_loader";
import { testGraphSessionStore } from "./helpers/test-graph-session-store";

function makeStore() {
  return testGraphSessionStore();
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
        screen.getByText("13 modules · 22 edges · 2 diagnostics"),
      ).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
  });

  it("lists facade bypasses in a copyable textarea", async () => {
    const writeText = vi.fn();
    Object.assign(navigator, { clipboard: { writeText } });

    render(
      <ProjectLoaderPanel
        store={makeStore()}
        pickFolder={async () => "/some/project"}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open folder…" }));

    await waitFor(() => {
      expect(screen.getByText("1 facade bypass")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("1 facade bypass"));

    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveValue(
      "src/ui/TodoList.tsx imports src/core/store.ts, bypassing the core facade",
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy list" }));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        "src/ui/TodoList.tsx imports src/core/store.ts, bypassing the core facade",
      );
    });
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
