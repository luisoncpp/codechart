// @Architecture(descriptionShort="Toolbar Search menu: opens the project find bar in content or file-name mode")
import { DropdownMenu, MenuActionItem } from "../../../../ui/dropdown_menu";
import { CanvasUiState } from "../controller/canvas-ui-state";

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
        onSelect={() => ui.openFindBar("content")}
      />
      <MenuActionItem
        label="Go to file"
        shortcut="Ctrl+P"
        onSelect={() => ui.openFindBar("files")}
      />
    </DropdownMenu>
  );
}
