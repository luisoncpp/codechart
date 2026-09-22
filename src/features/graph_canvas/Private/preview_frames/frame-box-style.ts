// @Architecture(descriptionShort="Builds a frame's inline box style: committed size from the model, floors and metrics from the TS constants")
import type { CSSProperties } from "react";
import {
  FRAME_HEIGHT,
  FRAME_WIDTH,
  MIN_FRAME_HEIGHT,
  MIN_FRAME_WIDTH,
  type PreviewFrame,
} from "./frame-list";
import { nativeScrollbarWidth } from "./scrollbar-metrics";

/**
 * The frame box is declared here rather than in `graph-canvas.css`:
 * `frame-placement.ts` runs collision and overflow math with `FRAME_WIDTH` /
 * `FRAME_HEIGHT` *before any element exists*, so the stylesheet cannot be the
 * source of truth for it. React renders the committed size inline (the model
 * owns it — `startFrameResize` commits on release, like `startFrameDrag`), and
 * the stylesheet reads the resize floors back as custom properties instead of
 * repeating the numbers.
 */
export function frameBoxStyle(frame: PreviewFrame): CSSProperties {
  return {
    top: frame.top,
    left: frame.left,
    width: frame.width ?? FRAME_WIDTH,
    height: frame.height ?? FRAME_HEIGHT,
    zIndex: 1000 + frame.zIndex,
    "--frame-min-width": `${MIN_FRAME_WIDTH}px`,
    "--frame-min-height": `${MIN_FRAME_HEIGHT}px`,
    // Keeps the resize grip clear of the body's scrollbar buttons.
    "--frame-scrollbar-width": `${nativeScrollbarWidth()}px`,
  } as CSSProperties;
}
