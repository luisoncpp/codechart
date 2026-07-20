import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  DropdownMenu,
  MenuActionItem,
  MenuCheckboxItem,
  MenuRadioItem,
  MenuSeparator,
} from "../src/ui/dropdown_menu";

function renderMenu(onAction = vi.fn(), onToggle = vi.fn()) {
  render(
    <DropdownMenu label="View">
      <MenuCheckboxItem label="Hide tests" checked={false} onChange={onToggle} />
      <MenuRadioItem label="Activity" checked onSelect={() => {}} />
      <MenuSeparator />
      <MenuActionItem label="Visualize diff…" onSelect={onAction} />
    </DropdownMenu>,
  );
  return { onAction, onToggle };
}

function openMenu() {
  fireEvent.click(screen.getByRole("button", { name: "View" }));
}

describe("DropdownMenu", () => {
  it("opens on trigger click with menu roles and aria state", () => {
    renderMenu();
    const trigger = screen.getByRole("button", { name: "View" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).toBeNull();

    openMenu();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitemcheckbox", { name: "Hide tests" }))
      .toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("menuitemradio", { name: "Activity" }))
      .toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("menuitem", { name: "Visualize diff…" })).toBeInTheDocument();
  });

  it("closes on Escape and on backdrop click", () => {
    renderMenu();
    openMenu();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();

    openMenu();
    fireEvent.click(screen.getByRole("presentation"));
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("keeps the menu open when toggling a checkbox item", () => {
    const { onToggle } = renderMenu();
    openMenu();
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Hide tests" }));
    expect(onToggle).toHaveBeenCalledWith(true);
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("runs an action item and closes the menu", () => {
    const { onAction } = renderMenu();
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Visualize diff…" }));
    expect(onAction).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("disables a checkbox item with a reason tooltip", () => {
    render(
      <DropdownMenu label="View">
        <MenuCheckboxItem
          label="Heatmap"
          checked={false}
          onChange={() => {}}
          disabled
          disabledReason="Requires a git repository"
        />
      </DropdownMenu>,
    );
    openMenu();
    const item = screen.getByRole("menuitemcheckbox", { name: "Heatmap" });
    expect(item).toBeDisabled();
    expect(item).toHaveAttribute("title", "Requires a git repository");
  });
});
