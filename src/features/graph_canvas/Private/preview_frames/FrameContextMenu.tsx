// @Architecture(descriptionShort="Preview-frame right-click menu: Copy and Copy with context")
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { copyMenuClipboardText, type CopyMenuKind } from "./copy-with-context";
import type { FrameCopyMenuState } from "./use-frame-copy-menu";

interface FrameContextMenuProps {
  menu: FrameCopyMenuState | null;
  onClose: () => void;
}

export function FrameContextMenu({ menu, onClose }: FrameContextMenuProps) {
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menu, onClose]);

  if (!menu) return null;
  return createPortal(<CopyMenuPanel menu={menu} onClose={onClose} />, document.body);
}

function CopyMenuPanel({ menu, onClose }: { menu: FrameCopyMenuState; onClose: () => void }) {
  const canCopy = menu.snippet.length > 0;
  const canContext = canCopy && menu.startLine !== null && menu.endLine !== null;
  const run = (kind: CopyMenuKind) => {
    const text = copyMenuClipboardText(menu, kind);
    if (text !== null) void writeClipboard(text);
    onClose();
  };

  return (
    <>
      <CopyMenuBackdrop onClose={onClose} />
      <div role="menu" className="frame-copy-menu" data-preview-keep style={{ top: menu.y, left: menu.x }}>
        <CopyMenuItem label="Copy" disabled={!canCopy} onSelect={/*copyPlain*/ () => run(/*kind=*/"plain")} />
        <CopyMenuItem
          label="Copy with context"
          disabled={!canContext}
          onSelect={/*copyWithContext*/ () => run(/*kind=*/"context")}
        />
      </div>
    </>
  );
}

function CopyMenuBackdrop({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="presentation"
      className="frame-copy-menu-backdrop"
      data-preview-keep
      onClick={onClose}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
    />
  );
}

function CopyMenuItem(props: { label: string; disabled: boolean; onSelect: () => void }) {
  return (
    <button type="button" role="menuitem" disabled={props.disabled} onClick={props.onSelect}>
      {props.label}
    </button>
  );
}

async function writeClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // clipboard access might be unavailable
  }
}
