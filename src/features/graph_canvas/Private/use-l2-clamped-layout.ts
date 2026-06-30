import { useState, useLayoutEffect, type RefObject, type CSSProperties } from "react";
import { useStore } from "@xyflow/react";

export function calculateVisibleBounds(
  nodeEl: HTMLDivElement,
  parentEl: Element,
  zoom: number,
  borderInset = 2 * zoom,
) {
  const nodeRect = nodeEl.getBoundingClientRect();
  const parentRect = parentEl.getBoundingClientRect();

  const nodeContentTopInScreen = nodeRect.top + borderInset - parentRect.top;
  const nodeContentBottomInScreen = nodeRect.bottom - borderInset - parentRect.top;
  const nodeContentLeftInScreen = nodeRect.left + borderInset - parentRect.left;
  const nodeContentRightInScreen = nodeRect.right - borderInset - parentRect.left;

  const verticalOverlap = nodeContentBottomInScreen > 0 && nodeContentTopInScreen < parentRect.height;
  const horizontalOverlap = nodeContentRightInScreen > 0 && nodeContentLeftInScreen < parentRect.width;

  if (!verticalOverlap || !horizontalOverlap) {
    return null;
  }

  const visibleTop = Math.max(0, nodeContentTopInScreen);
  const visibleBottom = Math.min(parentRect.height, nodeContentBottomInScreen);
  const visibleLeft = Math.max(0, nodeContentLeftInScreen);
  const visibleRight = Math.min(parentRect.width, nodeContentRightInScreen);

  return {
    top: (visibleTop - nodeContentTopInScreen) / zoom,
    height: (visibleBottom - visibleTop) / zoom,
    left: (visibleLeft - nodeContentLeftInScreen) / zoom,
    width: (visibleRight - visibleLeft) / zoom,
  };
}

const DEFAULT_CLAMP_STYLES: CSSProperties = {
  position: "absolute",
  top: 0,
  height: "100%",
  left: 0,
  width: "100%",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
};

/** Border width in screen px (`borderWidthNodePx * zoom`). Module shells use fixed node px. */
export const moduleL2BorderInset = (zoom: number) => 2 * zoom;
/** Group doc panel: accent border is `3/zoom` node px → 3 screen px (see node-border-clips lesson). */
export const groupDocBorderInset = (_zoom: number) => 3;

/** Clamp scrollable L2 content to the portion of `containerRef` visible in the canvas. */
export function useL2ClampedLayout(
  containerRef: RefObject<HTMLDivElement | null>,
  borderInset: (zoom: number) => number = moduleL2BorderInset,
) {
  const [state, setState] = useState<{ styles: CSSProperties; inFov: boolean }>({
    styles: DEFAULT_CLAMP_STYLES,
    inFov: false,
  });

  const zoom = useStore((s) => s.transform[2]);
  const tx = useStore((s) => s.transform[0]);
  const ty = useStore((s) => s.transform[1]);
  const w = useStore((s) => s.width);
  const h = useStore((s) => s.height);

  useLayoutEffect(/*updateBounds*/ () => {
    const el = containerRef.current;
    if (!el) return;
    const parentEl = document.querySelector(".react-flow");
    if (!parentEl) return;

    const inset = borderInset(zoom);
    const bounds = calculateVisibleBounds(el, parentEl, zoom, inset);
    if (!bounds) {
      setState({ styles: DEFAULT_CLAMP_STYLES, inFov: false });
      return;
    }

    setState({
      styles: { ...DEFAULT_CLAMP_STYLES, ...bounds },
      inFov: true,
    });
    // borderInset is a stable module-level fn (module vs group preset)
  }, [containerRef, zoom, tx, ty, w, h, borderInset]);

  return state;
}

export function layoutKeyFromStyles(styles: CSSProperties): string {
  return `${styles.top}|${styles.height}|${styles.left}|${styles.width}`;
}
