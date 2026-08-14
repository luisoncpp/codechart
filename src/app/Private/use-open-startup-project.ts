// @Architecture(descriptionShort="Auto-load a CLI-provided project path on app startup")
import { useEffect, useRef } from "react";
import type { GraphSessionStore } from "../../state/graph-session";
import type { StartupClient } from "../../ipc/startup-client";

export function useOpenStartupProject(
  store: GraphSessionStore,
  startup: StartupClient,
) {
  const opened = useRef(false);

  useEffect(() => {
    if (opened.current) return;
    let active = true;
    startup
      .getStartupProjectPath()
      .then((path) => {
        if (!active || !path || opened.current) return;
        opened.current = true;
        void store.loadProject(path);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [store, startup]);
}
