// @Architecture(descriptionShort="DOM coordinate resolution and element inspection over CDP")
import type { CdpClient } from "./cdp-client.ts";
import type { ClipRect, Point, PointTarget, QueryDomOptions } from "./types.ts";

export interface DomElementSummary {
  tag: string;
  id: string;
  role: string | null;
  text: string;
  rect: { x: number; y: number; width: number; height: number };
  visible: boolean;
}

function buildSelectorPointExpr(selector: string): string {
  const escaped = JSON.stringify(selector);
  return `(() => {
    const el = document.querySelector(${escaped});
    if (!el) return { error: "No element matches selector: " + ${escaped} };
    el.scrollIntoView({ block: "nearest", inline: "nearest" });
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return { error: "Matched element has zero size: " + ${escaped} };
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  })()`;
}

function buildTextPointExpr(text: string): string {
  const escaped = JSON.stringify(text);
  return `(() => {
    const needle = ${escaped}.trim().toLowerCase();
    const all = [...document.querySelectorAll("button,a,[role=button],input,label,span,div,p,h1,h2,h3")];
    const visible = all.filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    const exact = visible.filter((el) => (el.textContent || "").trim().toLowerCase() === needle).pop();
    const partial = visible.filter((el) => (el.textContent || "").trim().toLowerCase().includes(needle)).pop();
    const match = exact || partial;
    if (!match) return { error: "No visible element found with text: " + ${escaped} };
    match.scrollIntoView({ block: "nearest", inline: "nearest" });
    const r = match.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  })()`;
}

export async function resolveTargetPoint(cdp: CdpClient, target: PointTarget): Promise<Point> {
  if (target.x !== undefined && target.y !== undefined) {
    return { x: target.x, y: target.y };
  }
  const expr = target.selector
    ? buildSelectorPointExpr(target.selector)
    : target.text
      ? buildTextPointExpr(target.text)
      : null;
  if (!expr) {
    throw new Error("Target requires coordinates (x, y), selector, or text.");
  }
  const result = await cdp.evaluate<{ x?: number; y?: number; error?: string }>(expr);
  if (result.error || result.x === undefined || result.y === undefined) {
    throw new Error(result.error ?? "Failed to resolve target coordinates");
  }
  return { x: result.x, y: result.y };
}

export async function resolveElementClip(cdp: CdpClient, selector: string): Promise<ClipRect> {
  const escaped = JSON.stringify(selector);
  const res = await cdp.evaluate<{ clip?: ClipRect; error?: string }>(`(() => {
    const el = document.querySelector(${escaped});
    if (!el) return { error: "No element matches selector: " + ${escaped} };
    el.scrollIntoView({ block: "nearest", inline: "nearest" });
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return { error: "Element has zero bounds: " + ${escaped} };
    const x = Math.max(0, r.left);
    const y = Math.max(0, r.top);
    const width = Math.max(1, r.right - x);
    const height = Math.max(1, r.bottom - y);
    return { clip: { x, y, width, height, scale: 1 } };
  })()`);
  if (res.error || !res.clip) {
    throw new Error(res.error ?? `Failed to measure selector: ${selector}`);
  }
  return res.clip;
}

export async function queryDom(
  cdp: CdpClient,
  options: QueryDomOptions,
): Promise<DomElementSummary[]> {
  const escaped = JSON.stringify(options.selector);
  const limit = options.limit ?? 40;
  const visibleOnly = options.visibleOnly ?? true;
  return cdp.evaluate<DomElementSummary[]>(`(() => {
    const nodes = [...document.querySelectorAll(${escaped})];
    const items = [];
    for (const el of nodes) {
      const r = el.getBoundingClientRect();
      const visible = r.width > 0 && r.height > 0;
      if (${visibleOnly} && !visible) continue;
      items.push({
        tag: el.tagName.toLowerCase(),
        id: el.id || "",
        role: el.getAttribute("role"),
        text: (el.textContent || "").trim().slice(0, 140),
        rect: { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) },
        visible,
      });
      if (items.length >= ${limit}) break;
    }
    return items;
  })()`);
}
