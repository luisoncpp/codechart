// @Architecture(descriptionShort="Dev-only React adapter attaching PlaytestBridge to window")
import { useEffect, useMemo } from "react";
import type { CanvasViewportHandle } from "../../features/graph_canvas";
import {
  PlaytestBridge,
  type PlaytestBridgeDeps,
} from "./playtest-bridge";

/** Mounts `window.__codechartPlaytest` in dev builds and keeps inspector state current. */
export function usePlaytestBridge(
  deps: PlaytestBridgeDeps,
): (handle: CanvasViewportHandle | null) => void {
  const { store, ui, devtools, inspector } = deps;
  const bridge = useMemo(
    /*create playtest bridge*/ () =>
      import.meta.env.DEV ? new PlaytestBridge({ store, ui, devtools, inspector }) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, ui, devtools],
  );

  useEffect(() => {
    if (!bridge) return;
    bridge.updateInspector(inspector);
  }, [bridge, inspector]);

  useEffect(() => {
    if (!bridge) return;
    window.__codechartPlaytest = bridge;
    return () => {
      if (window.__codechartPlaytest === bridge) {
        delete window.__codechartPlaytest;
      }
    };
  }, [bridge]);

  return bridge ? bridge.setViewportHandle : noopViewport;
}

function noopViewport() {}
