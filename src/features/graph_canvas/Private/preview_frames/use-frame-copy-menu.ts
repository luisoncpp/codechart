// @Architecture(descriptionShort="Captures a preview-frame text selection for the copy context menu")
import { useState } from "react";
import type { CapturedCopySelection } from "./copy-with-context";
import { selectionLineRange } from "./selection-line-range";

export interface FrameCopyMenuState extends CapturedCopySelection {
  x: number;
  y: number;
}

export function captureCopyMenu(e: React.MouseEvent, path: string): FrameCopyMenuState {
  e.preventDefault();
  e.stopPropagation();
  const selection = window.getSelection();
  const range = selectionLineRange(selection);
  return {
    x: e.clientX,
    y: e.clientY,
    path,
    snippet: selection?.toString() ?? "",
    startLine: range?.startLine ?? null,
    endLine: range?.endLine ?? null,
  };
}

export function useFrameCopyMenu(path: string) {
  const [menu, setMenu] = useState<FrameCopyMenuState | null>(null);
  return {
    menu,
    onContextMenu: (e: React.MouseEvent) => setMenu(captureCopyMenu(e, path)),
    closeMenu: () => setMenu(null),
    consumeEscape: () => {
      if (!menu) return false;
      setMenu(null);
      return true;
    },
  };
}
