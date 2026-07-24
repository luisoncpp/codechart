// @Architecture(descriptionShort="Anchored dropdown menu trigger with backdrop-dismissed panel")
import { createContext, useEffect, useState, type ReactNode } from "react";
import { backdropStyle, panelStyle, triggerOpenStyle, triggerStyle } from "./menu-styles";

/** Action items call this to close the menu after running their handler. */
export const MenuCloseContext = createContext<() => void>(() => {});

interface DropdownMenuProps {
  label: string;
  children: ReactNode;
}

/** Toolbar dropdown: a labelled trigger opening an anchored `role="menu"` panel. */
export function DropdownMenu({ label, children }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(/*open=*/false);

  useEffect(/*closeOnEscape*/ () => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        style={open ? triggerOpenStyle : triggerStyle}
      >
        {label}
        <span aria-hidden="true" style={{ fontSize: 9 }}>
          ▾
        </span>
      </button>
      {open && (
        <>
          <div role="presentation" style={backdropStyle} onClick={close} />
          <div role="menu" aria-label={label} style={panelStyle}>
            <MenuCloseContext.Provider value={close}>{children}</MenuCloseContext.Provider>
          </div>
        </>
      )}
    </div>
  );
}
