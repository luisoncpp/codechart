// @Architecture(descriptionShort="Synchronous exported-symbol search over visible modules")
import { useEffect } from "react";
import type { GraphSessionStore } from "../../../../state/graph-session";
import type { BarResult } from "./bar-result";

/**
 * Runs the local exported-symbol search. Each matching module is one result,
 * so duplicate names in different modules and re-exports remain navigable.
 */
export function useSymbolSearch(
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
    onResult({ paths: store.searchExportedSymbols(trimmed), truncated: false });
  }, [store, query, onResult]);
}
