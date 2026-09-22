// @Architecture(descriptionShort="Scrolls a just-opened frame's body to its target line or markdown heading")
import { useEffect } from "react";
import { centerElementInBody } from "./center-in-body";

/** Heading centering needs 4 inputs, so it takes its own options object. */
interface MarkdownSectionTarget {
  frameRef: React.RefObject<HTMLDivElement | null>;
  /** Heading id to center, when the frame renders markdown. */
  sectionAnchor?: string;
  /** Re-centers when the source is replaced under the same frame. */
  sourceText: string;
  enabled: boolean;
}

/**
 * Both centering passes wait 50 ms: the frame is still animating through
 * `widget-fade-in`'s `scale()` on mount, and `centerElementInBody` needs the
 * rendered rows to measure. See
 * `docs/lessons-learned/client-rects-are-visual-pixels-scrolltop-is-layout.md`.
 */
const CENTER_DELAY_MS = 50;

/**
 * Centers a code row on open; no-op when the frame has no target line.
 * `line` is the row to center: a review range wins over the symbol definition.
 * `sourceText` re-centers when the source is replaced under the same frame.
 */
export function useCenterTargetLine(
  lineRef: React.RefObject<HTMLDivElement | null>,
  line: number | undefined,
  sourceText: string,
) {
  useEffect(() => {
    if (line === undefined) return;
    const timer = setTimeout(/*centerDefinitionLine*/ () => {
      centerElementInBody(lineRef.current);
    }, /*delayInMs=*/ CENTER_DELAY_MS);
    return () => clearTimeout(timer);
  }, [lineRef, line, sourceText]);
}

/** Centers and highlights a rendered-markdown heading on open. */
export function useCenterMarkdownSection({
  frameRef,
  sectionAnchor,
  sourceText,
  enabled,
}: MarkdownSectionTarget) {
  useEffect(() => {
    if (!enabled || !sectionAnchor) return;
    const timer = setTimeout(/*centerMarkdownHeading*/ () => {
      const body = frameRef.current?.querySelector(".group-markdown-body");
      const heading = body?.querySelector(`#${CSS.escape(sectionAnchor)}`);
      if (!(heading instanceof HTMLElement)) return;
      heading.classList.add("hl-section-target");
      centerElementInBody(heading);
    }, /*delayInMs=*/ CENTER_DELAY_MS);
    return () => clearTimeout(timer);
  }, [frameRef, enabled, sectionAnchor, sourceText]);
}
