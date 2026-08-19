// @Architecture(descriptionShort="Right-click menu for module nodes on the canvas")
import { useEffect, useState } from "react";
import type { ShellClient } from "../../../../ipc/shell-client";
import { joinRootPath } from "./join-root-path";

export interface ModuleContextMenuState {
  x: number;
  y: number;
  moduleId: string;
  modulePath: string;
  color: string;
  deleted: boolean;
}

interface ModuleContextMenuProps {
  menu: ModuleContextMenuState | null;
  projectRoot: string | null;
  shell: ShellClient;
  editor: string;
  onOpenPreview: (menu: ModuleContextMenuState) => void;
  onClose: () => void;
}

export function ModuleContextMenu({
  menu,
  projectRoot,
  shell,
  editor,
  onOpenPreview,
  onClose,
}: ModuleContextMenuProps) {
  const [openingEditor, setOpeningEditor] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setEditorError(null);
      onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menu, onClose]);

  if (!menu || !projectRoot) return null;

  const closeMenu = () => {
    setEditorError(null);
    onClose();
  };

  const copyRelativePath = () => {
    void navigator.clipboard.writeText(menu.modulePath);
    closeMenu();
  };

  const reveal = () => {
    void shell.revealInExplorer(joinRootPath(projectRoot, menu.modulePath));
    closeMenu();
  };

  const openInEditor = async () => {
    setOpeningEditor(true);
    setEditorError(null);
    try {
      await shell.openInEditor(joinRootPath(projectRoot, menu.modulePath), editor);
      closeMenu();
    } catch (error) {
      setEditorError(errorMessage(error));
    } finally {
      setOpeningEditor(false);
    }
  };

  const openPreview = () => {
    onOpenPreview(menu);
    // Defer unmount so this click cannot fall through onto the canvas and
    // dismiss the frame that openPreview just requested (pinned-frame case).
    setTimeout(/*closeAfterClickSettles*/ () => closeMenu(), /*delayInMs=*/0);
  };

  return (
    <>
      <div
        role="presentation"
        data-preview-keep
        style={{ position: "fixed", inset: 0, zIndex: 1000 }}
        onClick={closeMenu}
        onContextMenu={(e) => {
          e.preventDefault();
          closeMenu();
        }}
      />
      <div
        role="menu"
        data-preview-keep
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
          onClick={openPreview}
          style={menuItemStyle}
        >
          Open file preview
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={openInEditor}
          disabled={openingEditor || menu.deleted}
          style={menu.deleted ? disabledMenuItemStyle : menuItemStyle}
        >
          {openingEditor ? "Opening editor..." : "Open in editor"}
        </button>
        {editorError && (
          <div role="alert" style={errorStyle}>
            {editorError}
          </div>
        )}
        <button
          type="button"
          role="menuitem"
          onClick={copyRelativePath}
          style={menuItemStyle}
        >
          Copy relative path
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={reveal}
          disabled={menu.deleted}
          style={menu.deleted ? disabledMenuItemStyle : menuItemStyle}
        >
          Reveal in file explorer
        </button>
      </div>
    </>
  );
}

const menuItemStyle = {
  display: "block",
  width: "100%",
  padding: "6px 12px",
  border: "none",
  background: "transparent",
  textAlign: "left",
  fontSize: 12,
  color: "#0f172a",
  cursor: "pointer",
} as const;

const disabledMenuItemStyle = {
  ...menuItemStyle,
  opacity: 0.45,
  cursor: "not-allowed",
} as const;

const errorStyle = {
  margin: "4px 8px",
  padding: "6px 8px",
  maxWidth: 260,
  borderRadius: 4,
  background: "#fee2e2",
  color: "#991b1b",
  fontSize: 11,
  lineHeight: 1.35,
} as const;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
