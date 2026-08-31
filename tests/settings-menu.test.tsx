import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SettingsMenu } from "../src/features/project_settings";
import type { ProjectConfigClient } from "../src/ipc/project-config-client";

function renderMenu(onClearReviewInfo = vi.fn().mockResolvedValue(undefined)) {
  const client: ProjectConfigClient = {
    readProjectConfig: vi.fn(),
    writeProjectConfig: vi.fn(),
  } as unknown as ProjectConfigClient;
  render(
    <SettingsMenu
      root="/repo"
      editor="code"
      hasCppModules={false}
      client={client}
      onEditorSaved={() => {}}
      onCppConfigSaved={() => {}}
      onIgnoredPathsSaved={() => {}}
      onClearReviewInfo={onClearReviewInfo}
    />,
  );
  return { onClearReviewInfo };
}

function openClearDialog() {
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Clear review info..." }));
}

describe("SettingsMenu clear review info", () => {
  it("asks for confirmation before clearing", () => {
    const { onClearReviewInfo } = renderMenu();
    openClearDialog();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(onClearReviewInfo).not.toHaveBeenCalled();
  });

  it("cancel closes the dialog without clearing", () => {
    const { onClearReviewInfo } = renderMenu();
    openClearDialog();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onClearReviewInfo).not.toHaveBeenCalled();
  });

  it("confirm runs the clear and closes the dialog", async () => {
    const { onClearReviewInfo } = renderMenu();
    openClearDialog();
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onClearReviewInfo).toHaveBeenCalledTimes(1);
  });

  it("keeps the dialog open and shows the error when clearing fails", async () => {
    const onClearReviewInfo = vi.fn().mockRejectedValue(new Error("disk full"));
    renderMenu(onClearReviewInfo);
    openClearDialog();
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    await waitFor(() => expect(screen.getByText("disk full")).toBeInTheDocument());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
