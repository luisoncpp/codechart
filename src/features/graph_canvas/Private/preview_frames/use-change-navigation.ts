// @Architecture(descriptionShort="Next/previous diff change in a preview frame: DOM row scan, centering, Alt+↑/↓")
import { useEffect, useState } from "react";
import { centerElementInBody } from "./center-in-body";
import { changeBlockStarts, pickChangeBlock } from "./change-blocks";
import { targetFrame } from "./frame-target";

const SHORTCUT_DELTAS: Record<string, 1 | -1> = { ArrowDown: 1, ArrowUp: -1 };

/**
 * Steps through the frame body's change blocks. It reads the rendered rows at
 * click time (their `data-kind`), so it needs no props from the code renderer.
 */
class ChangeNavigator {
  private last: { index: number; scrollTop: number } | null = null;

  step(frame: HTMLElement | null, delta: 1 | -1): void {
    const body = frame?.querySelector<HTMLElement>(".symbol-widget__body");
    if (!body) return;
    const rows = Array.from(body.querySelectorAll<HTMLElement>(".symbol-widget__line"));
    const blocks = changeBlockStarts(rows.map((row) => row.dataset.kind ?? "")).map((i) => rows[i]!);
    const bodyBox = body.getBoundingClientRect();
    const index = pickChangeBlock({
      mids: blocks.map((row) => midpoint(row) - bodyBox.top),
      viewCenter: bodyBox.height / 2,
      delta,
      current: this.last?.scrollTop === body.scrollTop ? this.last.index : null,
    });
    if (index === -1) return;
    centerElementInBody(blocks[index]!);
    this.last = { index, scrollTop: body.scrollTop };
  }
}

function midpoint(el: HTMLElement): number {
  const box = el.getBoundingClientRect();
  return box.top + box.height / 2;
}

/** Hook adapter: one navigator per frame plus the Alt+↑/↓ shortcut; null while disabled. */
export function useChangeNavigation(
  frameRef: React.RefObject<HTMLDivElement | null>,
  enabled: boolean,
): { onStep: (delta: 1 | -1) => void } | null {
  const [navigator] = useState(/*createNavigator*/ () => new ChangeNavigator());

  useEffect(/*listenForAltArrows*/ () => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const delta = SHORTCUT_DELTAS[e.key];
      if (!delta || e.defaultPrevented || !e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (!frameRef.current || targetFrame() !== frameRef.current) return;
      e.preventDefault();
      navigator.step(frameRef.current, delta);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [frameRef, navigator, enabled]);

  if (!enabled) return null;
  return { onStep: (delta) => navigator.step(frameRef.current, delta) };
}
