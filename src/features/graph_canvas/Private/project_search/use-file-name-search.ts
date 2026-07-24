// @Architecture(descriptionShort="Synchronous go-to-file search over visible module file names")
import { useEffect } from "react";
import type { GraphSessionStore } from "../../../../state/graph-session";
import type { BarResult } from "./bar-result";

/**
 * Runs `store.searchModuleFiles` for `query`. Local and cheap, so no debounce
 * and results from the first character. An empty query clears results.
 * `onResult` must be referentially stable (wrap it in `useCallback`).
 */
export function useFileNameSearch(
  store: GraphSessionStore,
  query: string,
  onResult: (result: BarResult | null) => void,
): void {
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      onResult(null);
      return;
    }
    onResult({ paths: store.searchModuleFiles(trimmed), truncated: false });
  }, [store, query, onResult]);
}
