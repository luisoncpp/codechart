// @Architecture(descriptionShort="Menu item primitives: action, checkbox, radio, submenu, and separator")
import { useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { MenuCloseContext } from "./DropdownMenu";
import {
  checkSlotStyle,
  itemDisabledStyle,
  itemStyle,
  sectionHeaderStyle,
  separatorStyle,
  shortcutStyle,
  submenuBridgeStyle,
  submenuPanelStyle,
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
  disabled?: boolean;
  disabledReason?: string;
}

/** Selects one option of a set without closing the menu. */
export function MenuRadioItem({
  label,
  checked,
  onSelect,
  indent,
  disabled,
  disabledReason,
}: MenuRadioItemProps) {
  const base = disabled ? itemDisabledStyle : itemStyle;
  const style = indent ? { ...base, paddingLeft: 34 } : base;
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={checked}
      disabled={disabled}
      title={disabled ? disabledReason : undefined}
      style={style}
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

export function MenuSectionHeader({ label }: { label: string }) {
  return <div style={sectionHeaderStyle}>{label}</div>;
}

const CLOSE_DELAY_MS = 180;

interface MenuSubmenuProps {
  label: string;
  children: ReactNode;
}

/** Opens a cascading submenu on the right when hovered or clicked, with a diagonal hover grace period. */
export function MenuSubmenu({ label, children }: MenuSubmenuProps) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current === null) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const handleMouseEnter = () => {
    clearTimer();
    setOpen(/*open=*/true);
  };

  const handleMouseLeave = () => {
    clearTimer();
    timerRef.current = setTimeout(/*closeSubmenu*/ () => {
      setOpen(/*open=*/false);
    }, /*delayInMs=*/CLOSE_DELAY_MS);
  };

  useEffect(() => () => clearTimer(), []);

  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={open}
        style={open ? { ...itemStyle, background: "#f8fafc" } : itemStyle}
        onClick={() => {
          clearTimer();
          setOpen((prev) => !prev);
        }}
      >
        <span aria-hidden="true" style={checkSlotStyle} />
        <span>{label}</span>
        <span
          aria-hidden="true"
          style={{ marginLeft: "auto", paddingLeft: 16, fontSize: 9, color: "#94a3b8" }}
        >
          ▸
        </span>
      </button>
      {open && (
        <div
          role="menu"
          aria-label={label}
          style={submenuPanelStyle}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div aria-hidden="true" style={submenuBridgeStyle} />
          {children}
        </div>
      )}
    </div>
  );
}

