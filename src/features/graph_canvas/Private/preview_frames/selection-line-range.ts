// @Architecture(descriptionShort="Maps a DOM text selection onto 1-based source line numbers")

export interface LineRange {
  startLine: number;
  endLine: number;
}

/** Inclusive 1-based lines covering a selection, or null if it is not on source rows. */
export function selectionLineRange(selection: Selection | null): LineRange | null {
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  const start = lineOfNode(range.startContainer);
  const end = lineOfNode(range.endContainer);
  if (start === null || end === null) return null;
  return { startLine: Math.min(start, end), endLine: Math.max(start, end) };
}

function lineOfNode(node: Node): number | null {
  const el = node instanceof Element ? node : node.parentElement;
  const line = el?.closest("[data-line]");
  if (!(line instanceof HTMLElement)) return null;
  const n = Number(line.dataset.line);
  return Number.isFinite(n) && n > 0 ? n : null;
}
