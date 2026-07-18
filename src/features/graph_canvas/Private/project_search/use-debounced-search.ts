// @Architecture(descriptionShort="Debounced project-source search with stale-response guard")
import { useEffect, useRef } from "react";
import type { ProjectSearchResult } from "../../../../ipc/analysis-client";
import type { GraphSessionStore } from "../../../../state/graph-session";

const MIN_QUERY_CHARS = 2;
const DEBOUNCE_MS = 300;

/**
 * Runs `store.searchProjectSources` for `query`, debounced. Queries shorter
 * than `MIN_QUERY_CHARS` clear results immediately (no IPC). Out-of-order
 * async responses are dropped so `onResult` only ever sees the latest search.
 * `onResult` must be referentially stable (wrap it in `useCallback`).
 */
export function useDebouncedSearch(
  store: GraphSessionStore,
  query: string,
  onResult: (result: ProjectSearchResult | null) => void,
): void {
  const seq = useRef(0);

  useEffect(() => {
    const requestSeq = ++seq.current;
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_CHARS) {
      onResult(null);
      return;
    }
    const timer = setTimeout(/*runSearch*/ () => {
      void store.searchProjectSources(trimmed).then((result) => {
        if (seq.current === requestSeq) onResult(result);
      });
    }, /*delayInMs=*/ DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [store, query, onResult]);
}
