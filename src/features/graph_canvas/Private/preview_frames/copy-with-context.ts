// @Architecture(descriptionShort="Formats a preview-frame selection as a markdown fence with path and lines")

export interface CopyWithContext {
  path: string;
  startLine: number;
  endLine: number;
  snippet: string;
}

export interface CapturedCopySelection {
  path: string;
  snippet: string;
  startLine: number | null;
  endLine: number | null;
}

/** ` ```start:end:path ` fence plus the selected snippet. */
export function formatCopyWithContext(payload: CopyWithContext): string {
  const start = Math.min(payload.startLine, payload.endLine);
  const end = Math.max(payload.startLine, payload.endLine);
  const fence = codeFence(payload.snippet);
  return `${fence}${start}:${end}:${payload.path}\n${payload.snippet}\n${fence}`;
}

export type CopyMenuKind = "plain" | "context";

/** Clipboard payload for a captured frame selection, or null when that action is unavailable. */
export function copyMenuClipboardText(menu: CapturedCopySelection, kind: CopyMenuKind): string | null {
  if (!menu.snippet) return null;
  if (kind === "plain") return menu.snippet;
  if (menu.startLine === null || menu.endLine === null) return null;
  return formatCopyWithContext({
    path: menu.path,
    startLine: menu.startLine,
    endLine: menu.endLine,
    snippet: menu.snippet,
  });
}

function codeFence(snippet: string): string {
  let n = 3;
  let fence = "```";
  while (snippet.includes(fence)) {
    n += 1;
    fence = "`".repeat(n);
  }
  return fence;
}
