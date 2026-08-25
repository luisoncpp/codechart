import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { HelpMenu } from "../src/features/help_menu";

function renderHelpMenu() {
  render(<HelpMenu />);
}

function openHelpMenu() {
  fireEvent.click(screen.getByRole("button", { name: "Help" }));
}

describe("HelpMenu dropdown and modals", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("opens the Help menu and displays topic items", () => {
    renderHelpMenu();
    const trigger = screen.getByRole("button", { name: "Help" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).toBeNull();

    openHelpMenu();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu", { name: "Help" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Groups format..." })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Architecture tags..." })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Diff notes..." })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Wiki links..." })).toBeInTheDocument();
  });

  it("opens the Groups format documentation modal and renders content", () => {
    renderHelpMenu();
    openHelpMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Groups format..." }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Help: Groups format" })).toBeInTheDocument();
    expect(screen.getByText(/In CodeChart, architectural boundaries/)).toBeInTheDocument();
    expect(screen.getByText("Frontmatter Configuration")).toBeInTheDocument();
  });

  it("opens the Architecture tags documentation modal and renders content", () => {
    renderHelpMenu();
    openHelpMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Architecture tags..." }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Help: Architecture tags" })).toBeInTheDocument();
    expect(screen.getByText(/In CodeChart, source modules can define local architectural metadata/)).toBeInTheDocument();
    expect(screen.getByText("Description Length Rules")).toBeInTheDocument();
  });

  it("opens the Diff notes documentation modal", () => {
    renderHelpMenu();
    openHelpMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Diff notes..." }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Help: Diff notes" })).toBeInTheDocument();
    expect(screen.getByText(/Diff Notes allow you to embed/)).toBeInTheDocument();
  });

  it("opens the Wiki links documentation modal", () => {
    renderHelpMenu();
    openHelpMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Wiki links..." }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Help: Wiki links" })).toBeInTheDocument();
    expect(screen.getByText(/Wiki links allow instant navigation/)).toBeInTheDocument();
  });

  it("copies markdown to clipboard and updates button state", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    renderHelpMenu();
    openHelpMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Groups format..." }));

    const copyButtons = screen.getAllByRole("button", { name: "Copy markdown explanation" });
    expect(copyButtons.length).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.click(copyButtons[0]);
    });

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toContain("# Groups Format (`*.group.md`)");
    expect(screen.getAllByText("✓ Copied!").length).toBeGreaterThan(0);
  });

  it("closes the modal when clicking the close button", () => {
    renderHelpMenu();
    openHelpMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Wiki links..." }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    const closeButtons = screen.getAllByRole("button", { name: "Close" });
    fireEvent.click(closeButtons[0]);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes the modal on Escape keydown", () => {
    renderHelpMenu();
    openHelpMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Diff notes..." }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes the modal on backdrop click", () => {
    renderHelpMenu();
    openHelpMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Diff notes..." }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    const dialog = screen.getByRole("dialog");
    const backdrop = dialog.parentElement!;
    fireEvent.click(backdrop);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
