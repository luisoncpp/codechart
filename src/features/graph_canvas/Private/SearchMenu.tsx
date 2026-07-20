// @Architecture(descriptionShort="Toolbar Search menu: opens the project find bar (Go to file later)")
import { DropdownMenu, MenuActionItem } from "../../../ui/dropdown_menu";
import { CanvasUiState } from "./canvas-ui-state";

interface SearchMenuProps {
  ui: CanvasUiState;
}

/** Toolbar dropdown for search entry points. */
export function SearchMenu({ ui }: SearchMenuProps) {
  return (
    <DropdownMenu label="Search">
      <MenuActionItem
        label="Search project"
        shortcut="Ctrl+Shift+F"
        onSelect={() => ui.setFindBarOpen(/*open=*/true)}
      />
    </DropdownMenu>
  );
}
