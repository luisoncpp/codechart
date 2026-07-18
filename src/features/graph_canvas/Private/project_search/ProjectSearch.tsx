// @Architecture(descriptionShort="Ctrl+Shift+F find bar: full-text search over module sources with result navigation")
import { useCallback, useEffect, useRef, useState } from "react";
import type { ProjectSearchResult } from "../../../../ipc/analysis-client";
import type { GraphSessionStore } from "../../../../state/graph-session";
import type { ProgrammaticMoveGuard } from "../programmatic-move-guard";
import { stepIndex } from "./match-stepper";
import { useDebouncedSearch } from "./use-debounced-search";
import { ProjectSearchBar } from "./ProjectSearchBar";

export interface ProjectSearchDeps {
  store: GraphSessionStore;
  /** Preserves any already-open preview through the programmatic `focusOn` pan. */
  moveGuard: ProgrammaticMoveGuard;
}

interface ProjectSearchProps {
  deps: ProjectSearchDeps;
  belowDiffBar: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Always mounted (renders nothing while closed) so the Ctrl+Shift+F listener exists
 * before the bar opens. All search state is local: searching never touches the
 * session store, so the canvas does not re-render per keystroke.
 */
export function ProjectSearch({ deps, belowDiffBar, open, onOpenChange }: ProjectSearchProps) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<ProjectSearchResult | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(/*clearAndHide*/ () => {
    onOpenChange(/*open=*/false);
    setQuery("");
    setResult(null);
    setActiveIndex(-1);
  }, [onOpenChange]);

  useOpenShortcut(onOpenChange, inputRef);
  useCloseOnProjectChange(deps.store, close);
  useEffect(/*focusInputOnOpen*/ () => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const onResult = useCallback((next: ProjectSearchResult | null) => {
    setResult(next);
    setActiveIndex(-1);
  }, []);
  useDebouncedSearch(deps.store, open ? query : "", onResult);

  const goToMatch = async (delta: 1 | -1) => {
    if (!result || result.matches.length === 0) return;
    const next = stepIndex(activeIndex, delta, result.matches.length);
    setActiveIndex(next);
    const match = result.matches[next];
    const module = deps.store.getGraph()?.modules.find((m) => m.path === match.path);
    if (!module) return;
    deps.moveGuard.begin();
    await deps.store.focusOn(module.id);
  };

  if (!open) return null;
  return (
    <ProjectSearchBar
      query={query}
      onQueryChange={setQuery}
      counterText={counterText(result, activeIndex)}
      truncated={result?.truncated ?? false}
      canNavigate={!!result && result.matches.length > 0}
      onNavigate={(delta) => void goToMatch(delta)}
      onClose={close}
      inputRef={inputRef}
      belowDiffBar={belowDiffBar}
    />
  );
}

/** Ctrl/Cmd+Shift+F opens the bar (or refocuses it), even from another input. */
function useOpenShortcut(
  setOpen: (open: boolean) => void,
  inputRef: React.RefObject<HTMLInputElement | null>,
) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || !event.shiftKey) return;
      if (event.key.toLowerCase() !== "f") return;
      event.preventDefault();
      setOpen(true);
      inputRef.current?.select();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setOpen, inputRef]);
}

/** A project reload (or failure) invalidates line numbers — close and clear. */
function useCloseOnProjectChange(store: GraphSessionStore, close: () => void) {
  useEffect(() => {
    store.on("phase-changed", close);
    return () => store.off("phase-changed", close);
  }, [store, close]);
}

function counterText(result: ProjectSearchResult | null, activeIndex: number): string | null {
  if (!result) return null;
  if (result.matches.length === 0) return "No results";
  const total = result.truncated ? `${result.matches.length}+` : `${result.matches.length}`;
  return `${activeIndex + 1} of ${total}`;
}
