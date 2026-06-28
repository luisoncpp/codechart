// @Architecture(descriptionShort="Right-click menu for module nodes on the canvas")
import { useEffect } from "react";
import type { ShellClient } from "../../../ipc/shell-client";
import { joinRootPath } from "./join-root-path";

export interface ModuleContextMenuState {
  x: number;
  y: number;
  modulePath: string;
}

interface ModuleContextMenuProps {
  menu: ModuleContextMenuState | null;
  projectRoot: string | null;
  shell: ShellClient;
  onClose: () => void;
}

export function ModuleContextMenu({
  menu,
  projectRoot,
  shell,
  onClose,
}: ModuleContextMenuProps) {
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menu, onClose]);

  if (!menu || !projectRoot) return null;

  const reveal = () => {
    void shell.revealInExplorer(joinRootPath(projectRoot, menu.modulePath));
    onClose();
  };

  return (
    <>
      <div
        role="presentation"
        style={{ position: "fixed", inset: 0, zIndex: 1000 }}
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        role="menu"
        style={{
          position: "fixed",
          top: menu.y,
          left: menu.x,
          zIndex: 1001,
          minWidth: 180,
          padding: "4px 0",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 6,
          boxShadow: "0 4px 12px rgba(15, 23, 42, 0.12)",
        }}
      >
        <button
          type="button"
          role="menuitem"
          onClick={reveal}
          style={{
            display: "block",
            width: "100%",
            padding: "6px 12px",
            border: "none",
            background: "transparent",
            textAlign: "left",
            fontSize: 12,
            color: "#0f172a",
            cursor: "pointer",
          }}
        >
          Reveal in file explorer
        </button>
      </div>
    </>
  );
}
