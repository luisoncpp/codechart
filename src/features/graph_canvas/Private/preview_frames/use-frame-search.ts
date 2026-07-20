// @Architecture(descriptionShort="Per-frame find state: query, matches, active index, Ctrl+F targeting, centering")
import { useEffect, useMemo, useRef, useState } from "react";
import { stepIndex } from "../match-stepper";
import { centerElementInBody } from "./center-in-body";
import { findFrameMatches, type FrameMatch } from "./frame-search";

interface UseFrameSearchArgs {
  frameRef: React.RefObject<HTMLDivElement | null>;
  description?: string;
  sourceText: string;
  /** Opens the bar pre-filled on mount (e.g. carried over from project search). */
  initialQuery?: string;
}

/** The frame the Ctrl+F press targets: focused frame first, hovered frame else. */
function targetFrame(): Element | null {
  return (
    document.activeElement?.closest(".symbol-widget") ??
    document.querySelector(".symbol-widget:hover")
  );
}

function useOpenShortcut(frameRef: React.RefObject<HTMLDivElement | null>, open: () => void) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || !(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return;
      if (e.key.toLowerCase() !== "f") return;
      if (!frameRef.current || targetFrame() !== frameRef.current) return;
      e.preventDefault();
      open();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [frameRef, open]);
}

export function useFrameSearch({ frameRef, description, sourceText, initialQuery }: UseFrameSearchArgs) {
  const [barOpen, setBarOpen] = useState(!!initialQuery);
  const [query, setQueryState] = useState(initialQuery ?? "");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeMatchRef = useRef<HTMLElement>(null);

  const matches: readonly FrameMatch[] = useMemo(
    /*searchFrameText*/ () => findFrameMatches({ description, sourceText, query }),
    [description, sourceText, query],
  );

  const openBar = () => {
    setBarOpen(true);
    requestAnimationFrame(/*focusFindInput*/ () => {
      inputRef.current?.select();
      inputRef.current?.focus({ preventScroll: true });
    });
  };

  const closeBar = () => {
    setBarOpen(false);
    setQueryState("");
    setActiveIndex(0);
  };

  const setQuery = (q: string) => {
    setQueryState(q);
    setActiveIndex(0);
  };

  const navigate = (delta: 1 | -1) => {
    setActiveIndex((current) => stepIndex(current, delta, matches.length));
  };

  useOpenShortcut(frameRef, openBar);
  useCenterActiveMatch(activeMatchRef, matches, activeIndex);

  return { barOpen, openBar, closeBar, query, setQuery, matches, activeIndex, navigate, inputRef, activeMatchRef };
}

function useCenterActiveMatch(
  activeMatchRef: React.RefObject<HTMLElement | null>,
  matches: readonly FrameMatch[],
  activeIndex: number,
) {
  useEffect(() => {
    if (matches.length === 0) return;
    const frame = requestAnimationFrame(/*centerActiveMatch*/ () => {
      centerElementInBody(activeMatchRef.current);
    });
    return () => cancelAnimationFrame(frame);
  }, [activeMatchRef, matches, activeIndex]);
}
