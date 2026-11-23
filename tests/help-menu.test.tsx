import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { HelpMenu } from "../src/features/help_menu";

function renderHelpMenu(executablePath: string | null = null) {
  render(<HelpMenu getExecutablePath={async () => executablePath} />);
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
    expect(screen.getByRole("menuitem", { name: "MCP server..." })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Code review skill / prompt..." })).toBeInTheDocument();
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
    expect(screen.getByText(/constrain outbound solid imports/)).toBeInTheDocument();
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

  it("opens the MCP server and Code review skill/prompt modals", async () => {
    renderHelpMenu();
    openHelpMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "MCP server..." }));
    expect(await screen.findByRole("heading", { name: "Help: MCP server" })).toBeInTheDocument();
    expect(screen.getByText(/Replace .*with the absolute path of the installed executable/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tools (15)" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Troubleshooting" })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Close" })[0]);
    openHelpMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Code review skill / prompt..." }));
    expect(screen.getByRole("heading", { name: "Help: Code review skill / prompt" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Workflow" })).toBeInTheDocument();
  });

  // The registration snippets must name the installed executable, so no source checkout is needed.
  it("fills the MCP registration snippets with the running executable's path", async () => {
    renderHelpMenu(String.raw`C:\Users\me\AppData\Local\codechart\codechart.exe`);
    openHelpMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "MCP server..." }));

    const exe = "C:/Users/me/AppData/Local/codechart/codechart.exe";
    expect(await screen.findByText(new RegExp(`"command": "${exe}"`))).toBeInTheDocument();
    expect(screen.queryByText(/<codechart\.exe>/)).toBeNull();
    expect(screen.getByText(/already point at this installation's executable/)).toBeInTheDocument();
  });

  // The skill starts with SKILL.md frontmatter; marked would render it as an
  // <hr> plus a setext heading, so the modal shows it as a YAML code block.
  it("renders the code review skill frontmatter as a code block, not a heading", () => {
    renderHelpMenu();
    openHelpMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Code review skill / prompt..." }));

    const dialog = screen.getByRole("dialog");
    const code = [...dialog.querySelectorAll("pre code")].map((el) => el.textContent ?? "");
    expect(code.some((text) => text.startsWith("name: codechart-review"))).toBe(true);
    expect(dialog.querySelector("hr")).toBeNull();
  });

  it("copies the code review skill without the human-only intro", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    renderHelpMenu();
    openHelpMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Code review skill / prompt..." }));
    expect(screen.getByText(/How to use:/)).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", { name: "Copy markdown explanation" })[0]);
    });

    const copied = writeText.mock.calls[0][0] as string;
    expect(copied.startsWith("---\nname: codechart-review\n")).toBe(true);
    expect(copied).not.toContain("How to use:");
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

  // A literal `|` inside a Groups-format table cell (e.g. spelling a union
  // type) splits the cell even when backslash-escaped: marked then truncates
  // the row to the header width and the description column disappears.
  it("keeps every cell of the facades row in the Groups format table", () => {
    renderHelpMenu();
    openHelpMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Groups format..." }));

    const dialog = screen.getByRole("dialog");
    const header = dialog.querySelector("thead tr")!;
    const row = [...dialog.querySelectorAll("tbody tr")].find(
      (tr) => tr.querySelector("td")?.textContent === "facades",
    )!;
    expect(row.querySelectorAll("td")).toHaveLength(
      header.querySelectorAll("th").length,
    );
    expect(row.textContent).toContain("Entrypoint modules");
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
