import { useEffect, useState } from "react";
import { GraphSessionStore } from "./graph-session-store";

export function useGraphSession(store: GraphSessionStore) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const listener = () => setTick((t) => t + 1);
    store.on("phase-changed", listener);
    return () => store.off("phase-changed", listener);
  }, [store]);

  return store;
}
