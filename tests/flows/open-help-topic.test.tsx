/// <reference types="@testing-library/jest-dom" />
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { HelpMenu } from "../../src/features/help_menu";

describe("flow: open help topic and copy markdown", () => {
  it("opens a help topic from toolbar, copies markdown, and closes", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<HelpMenu />);

    // 1. Open Help dropdown menu
    fireEvent.click(screen.getByRole("button", { name: "Help" }));
    expect(screen.getByRole("menu", { name: "Help" })).toBeInTheDocument();

    // 2. Select a topic (Groups format)
    fireEvent.click(screen.getByRole("menuitem", { name: "Groups format..." }));
    expect(screen.queryByRole("menu")).toBeNull();

    // 3. Verify modal is rendered with topic documentation
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Help: Groups format" })).toBeInTheDocument();

    // 4. Click copy markdown button
    const copyBtn = screen.getAllByRole("button", { name: "Copy markdown explanation" })[0];
    await act(async () => {
      fireEvent.click(copyBtn);
    });
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Groups Format (`*.group.md`)"));

    // 5. Close the modal
    const closeBtn = screen.getAllByRole("button", { name: "Close" })[0];
    fireEvent.click(closeBtn);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
