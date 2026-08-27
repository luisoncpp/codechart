import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { ProjectLoaderPanel } from "../../src/features/project_loader";
import type { GraphSessionStore } from "../../src/state/graph-session";
import { testGraphSessionStore } from "./test-graph-session-store";

function projectLoaderStore(): GraphSessionStore {
  return testGraphSessionStore();
}

export function renderProjectLoaderPanel(
  pickFolder: () => Promise<string | null>,
  store: GraphSessionStore = projectLoaderStore(),
) {
  render(<ProjectLoaderPanel store={store} pickFolder={pickFolder} />);
  return store;
}

export function clickOpenFolder() {
  fireEvent.click(screen.getByRole("button", { name: "Open folder…" }));
}

export async function waitForGraphSummary() {
  await waitFor(() => {
    expect(
      screen.getByText("13 modules · 22 edges · 2 diagnostics"),
    ).toBeInTheDocument();
  });
}

async function waitForArchitectureIssuesButton() {
  await waitFor(() => {
    expect(screen.getByRole("button", { name: "1 architecture issue" })).toBeInTheDocument();
  });
}

export function mockClipboardWriteText() {
  const writeText = vi.fn();
  Object.assign(navigator, { clipboard: { writeText } });
  return writeText;
}

export async function openArchitectureIssuesDialog() {
  renderProjectLoaderPanel(async () => "/some/project");
  clickOpenFolder();
  await waitForArchitectureIssuesButton();
  fireEvent.click(screen.getByRole("button", { name: "1 architecture issue" }));
  return screen.getByRole("dialog");
}
