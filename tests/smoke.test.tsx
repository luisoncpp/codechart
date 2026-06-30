import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { ProjectLoaderPanel } from "../src/features/project_loader";
import {
  clickOpenFolder,
  mockClipboardWriteText,
  openFacadeBypassDialog,
  renderProjectLoaderPanel,
  waitForGraphSummary,
} from "./helpers/project-loader-panel";

describe("ProjectLoaderPanel", () => {
  it("starts idle and prompts the user to open a project", () => {
    renderProjectLoaderPanel(async () => null);

    expect(screen.getByText("Codechart")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open folder…" })).toBeInTheDocument();
    expect(
      screen.getByText("Open a project folder to map it."),
    ).toBeInTheDocument();
  });

  it("loads the picked folder and shows the graph summary", async () => {
    renderProjectLoaderPanel(async () => "/some/project");
    clickOpenFolder();
    await waitForGraphSummary();
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
  });

  it("lists facade bypasses in a modal with a copyable textarea", async () => {
    const writeText = mockClipboardWriteText();
    const dialog = await openFacadeBypassDialog();

    const textarea = within(dialog).getByRole("textbox");
    expect(textarea).toHaveValue(
      "src/ui/TodoList.tsx imports src/core/store.ts, bypassing the core facade",
    );

    fireEvent.click(within(dialog).getByRole("button", { name: "Copy list" }));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        "src/ui/TodoList.tsx imports src/core/store.ts, bypassing the core facade",
      );
    });

    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("stays idle when the picker is cancelled", async () => {
    renderProjectLoaderPanel(async () => null);
    clickOpenFolder();
    await waitFor(() => {
      expect(
        screen.getByText("Open a project folder to map it."),
      ).toBeInTheDocument();
    });
  });
});
