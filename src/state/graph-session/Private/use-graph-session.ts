import { useEffect, useState } from "react";
import { GraphSessionStore } from "./graph-session-store";

export function useGraphSession(store: GraphSessionStore) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const listener = () => setTick((t) => t + 1);
    const events = ["phase-changed", "selection-changed"];
    events.forEach((e) => store.on(e, listener));
    return () => events.forEach((e) => store.off(e, listener));
  }, [store]);

  return store;
}
