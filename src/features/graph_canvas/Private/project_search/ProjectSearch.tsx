// @Architecture(descriptionShort="Find bar: Ctrl+Shift+F full-text search / Ctrl+P go-to-file, with result navigation")
import { useCallback, useEffect, useRef, useState } from "react";
import type { GraphSessionStore } from "../../../../state/graph-session";
import type { FindBarMode } from "../controller/canvas-ui-state";
import type { ProgrammaticMoveGuard } from "../navigation/programmatic-move-guard";
import { stepIndex } from "../highlight/match-stepper";
import { useDebouncedSearch } from "./use-debounced-search";
import { useFileNameSearch } from "./use-file-name-search";
import { ProjectSearchBar } from "./ProjectSearchBar";
import type { BarResult } from "./bar-result";

export interface ProjectSearchDeps {
  store: GraphSessionStore;
  /** Preserves any already-open preview through the programmatic `focusOn` pan. */
  moveGuard: ProgrammaticMoveGuard;
}

interface ProjectSearchProps {
  deps: ProjectSearchDeps;
  belowDiffBar: boolean;
  open: boolean;
  mode: FindBarMode;
  onOpen: (mode: FindBarMode) => void;
  onClose: () => void;
  /** Mirrors the live content query out (cleared on close) for preview-frame seeding. */
  onQueryChange: (query: string) => void;
}

/**
 * Always mounted (renders nothing while closed) so the keyboard listener exists
 * before the bar opens. All search state is local: searching never touches the
 * session store, so the canvas does not re-render per keystroke.
 */
export function ProjectSearch(props: ProjectSearchProps) {
  const { deps, open, mode, onOpen, onClose, onQueryChange } = props;
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<BarResult | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const clear = useCallback(/*resetLocalState*/ () => {
    setQuery("");
    onQueryChange("");
    setResult(null);
    setActiveIndex(-1);
  }, [onQueryChange]);

  const close = useCallback(/*clearAndHide*/ () => {
    onClose();
    clear();
  }, [onClose, clear]);

  const changeQuery = (next: string) => {
    setQuery(next);
    if (mode === "content") onQueryChange(next);
  };

  useOpenShortcut(onOpen, inputRef);
  useCloseOnProjectChange(deps.store, close);
  useEffect(/*focusInputOnOpen*/ () => {
    if (open) inputRef.current?.focus();
  }, [open, mode]);
  useClearOnModeSwitch(mode, clear);

  const onResult = useCallback((next: BarResult | null) => {
    setResult(next);
    setActiveIndex(-1);
  }, []);
  useDebouncedSearch(deps.store, open && mode === "content" ? query : "", onResult);
  useFileNameSearch(deps.store, open && mode === "files" ? query : "", onResult);

  const goToMatch = async (delta: 1 | -1) => {
    if (!result || result.paths.length === 0) return;
    const next = stepIndex(activeIndex, delta, result.paths.length);
    setActiveIndex(next);
    const module = deps.store.getGraph()?.modules.find((m) => m.path === result.paths[next]);
    if (!module) return;
    deps.moveGuard.begin();
    await deps.store.focusOn(module.id);
  };

  if (!open) return null;
  return (
    <ProjectSearchBar
      query={query}
      onQueryChange={changeQuery}
      placeholder={mode === "files" ? "Go to file…" : "Search in project…"}
      ariaLabel={mode === "files" ? "Go to file" : "Search in project"}
      counterText={counterText(result, activeIndex)}
      truncated={result?.truncated ?? false}
      canNavigate={!!result && result.paths.length > 0}
      onNavigate={(delta) => void goToMatch(delta)}
      onClose={close}
      inputRef={inputRef}
      belowDiffBar={props.belowDiffBar}
    />
  );
}

/** Ctrl/Cmd+Shift+F opens content search, Ctrl/Cmd+P go-to-file — even from another input. */
function useOpenShortcut(
  onOpen: (mode: FindBarMode) => void,
  inputRef: React.RefObject<HTMLInputElement | null>,
) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mode = shortcutMode(event);
      if (!mode) return;
      event.preventDefault();
      onOpen(mode);
      inputRef.current?.select();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpen, inputRef]);
}

function shortcutMode(event: KeyboardEvent): FindBarMode | null {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return null;
  const key = event.key.toLowerCase();
  if (event.shiftKey) return key === "f" ? "content" : null;
  return key === "p" ? "files" : null;
}

/**
 * A content query is meaningless as a file name (and vice versa): switching
 * modes clears it. `clear` is read through a ref because it captures inline
 * canvas props — depending on it would wipe results on unrelated re-renders.
 */
function useClearOnModeSwitch(mode: FindBarMode, clear: () => void) {
  const clearRef = useRef(clear);
  clearRef.current = clear;
  const previousMode = useRef(mode);
  useEffect(() => {
    if (previousMode.current === mode) return;
    previousMode.current = mode;
    clearRef.current();
  }, [mode]);
}

/** A project reload (or failure) invalidates results — close and clear. */
function useCloseOnProjectChange(store: GraphSessionStore, close: () => void) {
  useEffect(() => {
    store.on("phase-changed", close);
    return () => store.off("phase-changed", close);
  }, [store, close]);
}

function counterText(result: BarResult | null, activeIndex: number): string | null {
  if (!result) return null;
  if (result.paths.length === 0) return "No results";
  const total = result.truncated ? `${result.paths.length}+` : `${result.paths.length}`;
  return `${activeIndex + 1} of ${total}`;
}
