// @Architecture(descriptionShort="Menu item primitives: action, checkbox, radio, and separator")
import { useContext, type ReactNode } from "react";
import { MenuCloseContext } from "./DropdownMenu";
import {
  checkSlotStyle,
  itemDisabledStyle,
  itemStyle,
  separatorStyle,
  shortcutStyle,
} from "./menu-styles";

interface MenuActionItemProps {
  label: string;
  onSelect: () => void;
  shortcut?: string;
}

/** Runs its handler and closes the menu. */
export function MenuActionItem({ label, onSelect, shortcut }: MenuActionItemProps) {
  const close = useContext(MenuCloseContext);
  return (
    <button
      type="button"
      role="menuitem"
      style={itemStyle}
      onClick={() => {
        onSelect();
        close();
      }}
    >
      <span aria-hidden="true" style={checkSlotStyle} />
      {label}
      {shortcut && <span style={shortcutStyle}>{shortcut}</span>}
    </button>
  );
}

interface MenuCheckboxItemProps {
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  disabledReason?: string;
}

/** Toggles without closing the menu. */
export function MenuCheckboxItem({
  label,
  checked,
  onChange,
  disabled,
  disabledReason,
}: MenuCheckboxItemProps) {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={checked}
      disabled={disabled}
      title={disabled ? disabledReason : undefined}
      style={disabled ? itemDisabledStyle : itemStyle}
      onClick={() => onChange(!checked)}
    >
      <span aria-hidden="true" style={checkSlotStyle}>
        {checked ? "✓" : ""}
      </span>
      {label}
    </button>
  );
}

interface MenuRadioItemProps {
  label: string;
  checked: boolean;
  onSelect: () => void;
  /** Visually nests the item under its parent checkbox (e.g. heatmap modes). */
  indent?: boolean;
}

/** Selects one option of a set without closing the menu. */
export function MenuRadioItem({ label, checked, onSelect, indent }: MenuRadioItemProps) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={checked}
      style={indent ? { ...itemStyle, paddingLeft: 34 } : itemStyle}
      onClick={onSelect}
    >
      <span aria-hidden="true" style={checkSlotStyle}>
        {checked ? "●" : ""}
      </span>
      {label}
    </button>
  );
}

export function MenuSeparator() {
  return <div role="separator" style={separatorStyle} />;
}
